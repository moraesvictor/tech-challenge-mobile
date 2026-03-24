import * as AuthSession from 'expo-auth-session';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Google "Web client" only accepts http(s) redirect URIs — not `exp://…` from the default Expo hook.
 * Prefer `EXPO_PUBLIC_EXPO_PROJECT_FULL_NAME=@sua-conta-expo/slug` so o URI bate com o cadastrado no Google Cloud.
 */
function resolveGoogleAuthRedirectUri(): string {
  if (Platform.OS === 'web') {
    return AuthSession.makeRedirectUri({ preferLocalhost: true });
  }

  const fromEnv = process.env.EXPO_PUBLIC_EXPO_PROJECT_FULL_NAME?.trim();
  if (fromEnv?.includes('/')) {
    const normalized = fromEnv.startsWith('@') ? fromEnv : `@${fromEnv}`;
    return `https://auth.expo.io/${normalized}`;
  }

  try {
    return AuthSession.getRedirectUrl();
  } catch {
    return AuthSession.makeRedirectUri({ path: 'oauthredirect' });
  }
}

function authErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('code' in err)) return undefined;
  const c = (err as { code?: unknown }).code;
  return typeof c === 'string' ? c : undefined;
}

function formatAuthError(err: unknown): string {
  const code = authErrorCode(err);
  const raw = err instanceof Error ? err.message : String(err);

  if (code === 'auth/account-exists-with-different-credential') {
    return (
      'Esta conta já está ligada a outro método de login. ' +
      'Use “Continuar com Google” ou o e-mail/senha que você usou ao criar a conta.'
    );
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found' ||
    code === 'auth/invalid-email'
  ) {
    return 'E-mail ou senha incorretos. Se você só entrou com Google antes, use “Continuar com Google”.';
  }

  if (code === 'auth/operation-not-allowed' || /operation-not-allowed/i.test(raw)) {
    return (
      'Este método de login está desativado no Firebase. ' +
      'No Console: Authentication → Sign-in method → ative o provedor (E-mail/senha e/ou Google) e salve.'
    );
  }

  return raw;
}

type GoogleSignInBlockProps = {
  webClientId: string;
  authReady: boolean;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  submitting: boolean;
  googleSubmitting: boolean;
  onGoogleSubmitting: (busy: boolean) => void;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

/** Isolated so `useIdTokenAuthRequest` only runs when a client id is configured (empty config throws on native). */
function GoogleSignInBlock({
  webClientId,
  authReady,
  signInWithGoogleIdToken,
  submitting,
  googleSubmitting,
  onGoogleSubmitting,
  setError,
}: GoogleSignInBlockProps) {
  const redirectUri = useMemo(() => resolveGoogleAuthRedirectUri(), []);

  const [googleRequest, googleResponse, promptGoogleAsync] = useIdTokenAuthRequest({
    // `clientId` is required on iOS/Android (`webClientId` alone is ignored there).
    clientId: webClientId,
    redirectUri,
  });

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'error') {
      const desc = googleResponse.params?.error_description;
      const msg =
        typeof desc === 'string'
          ? decodeURIComponent(desc.replace(/\+/g, ' '))
          : googleResponse.error?.message ?? 'Falha ao entrar com Google.';
      const errParam = googleResponse.params?.error;
      const isRedirectMismatch =
        errParam === 'redirect_uri_mismatch' || /redirect_uri/i.test(msg);
      setError(
        isRedirectMismatch
          ? `${msg}\n\nNo Google Cloud → Credenciais → cliente Web → URIs de redirecionamento, adicione exatamente:\n${redirectUri}\n\nSe usar Expo Go, confira também EXPO_PUBLIC_EXPO_PROJECT_FULL_NAME no .env (@seu-usuario-expo/mobile-app-financial).`
          : msg
      );
      return;
    }
    if (googleResponse.type !== 'success') return;
    const idToken = googleResponse.params.id_token;
    if (!idToken) {
      setError(
        'Google não retornou id_token. Confira EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID e os redirect URIs no Google Cloud (veja README).'
      );
      return;
    }
    void (async () => {
      if (!authReady) {
        setError('Configure o Firebase: copie .env.example para .env e preencha EXPO_PUBLIC_FIREBASE_*.');
        return;
      }
      onGoogleSubmitting(true);
      setError(null);
      try {
        await signInWithGoogleIdToken(idToken);
      } catch (e: unknown) {
        setError(formatAuthError(e));
      } finally {
        onGoogleSubmitting(false);
      }
    })();
  }, [authReady, googleResponse, onGoogleSubmitting, redirectUri, setError, signInWithGoogleIdToken]);

  const [prompting, setPrompting] = useState(false);
  const googleBusy = prompting || googleSubmitting;

  return (
    <Pressable
      style={[styles.googleBtn, (!googleRequest || googleBusy || submitting) && styles.btnDisabled]}
      onPress={() => {
        setError(null);
        setPrompting(true);
        void promptGoogleAsync().finally(() => setPrompting(false));
      }}
      disabled={!authReady || !googleRequest || googleBusy || submitting}
    >
      {googleBusy ? (
        <ActivityIndicator color="#1e293b" />
      ) : (
        <Text style={styles.googleBtnText}>Continuar com Google</Text>
      )}
    </Pressable>
  );
}

export function AuthScreen() {
  const { signIn, signUp, signInWithGoogleIdToken, authReady } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';

  const validate = useCallback((): string | null => {
    const e = email.trim();
    if (!e) {
      return 'Email is required.';
    }
    if (!emailRegex.test(e)) {
      return 'Enter a valid email address.';
    }
    if (!password) {
      return 'Password is required.';
    }
    if (mode === 'register' && password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return null;
  }, [email, password, mode]);

  const onSubmit = useCallback(async () => {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    if (!authReady) {
      setError('Configure o Firebase: copie .env.example para .env e preencha EXPO_PUBLIC_FIREBASE_*.');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: unknown) {
      setError(formatAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }, [authReady, email, mode, password, signIn, signUp, validate]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Finance</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
        </Text>

        {!authReady ? (
          <Text style={styles.warn}>
            Crie um arquivo `.env` na raiz com as variáveis EXPO_PUBLIC_FIREBASE_* (veja
            .env.example). Reinicie o Expo após alterar.
          </Text>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#64748b"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryBtn, (submitting || googleSubmitting) && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={submitting || googleSubmitting}
        >
          {submitting ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {mode === 'login' ? 'Sign in' : 'Register'}
            </Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        {webClientId ? (
          <GoogleSignInBlock
            webClientId={webClientId}
            authReady={authReady}
            signInWithGoogleIdToken={signInWithGoogleIdToken}
            submitting={submitting}
            googleSubmitting={googleSubmitting}
            onGoogleSubmitting={setGoogleSubmitting}
            setError={setError}
          />
        ) : (
          <>
            <Pressable
              style={[styles.googleBtn, styles.btnDisabled]}
              onPress={() => {
                setError(
                  authReady
                    ? 'Para usar Google, adicione EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID no `.env` (cliente OAuth Web no Google Cloud do mesmo projeto do Firebase) e reinicie o Expo.'
                    : 'Configure o Firebase no `.env` primeiro; depois adicione EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID para o Google.'
                );
              }}
            >
              <Text style={styles.googleBtnText}>Continuar com Google</Text>
            </Pressable>
            <Text style={styles.hint}>
              O botão acima fica ativo quando você definir `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (veja `.env.example`).
            </Text>
          </>
        )}

        <Pressable
          style={styles.switchBtn}
          onPress={() => {
            setMode((m) => (m === 'login' ? 'register' : 'login'));
            setError(null);
          }}
        >
          <Text style={styles.switchText}>
            {mode === 'login'
              ? 'Need an account? Register'
              : 'Already have an account? Sign in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    marginBottom: 20,
  },
  warn: {
    color: '#fbbf24',
    marginBottom: 12,
    fontSize: 13,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  error: {
    color: '#f87171',
    marginTop: 12,
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: '#2dd4bf',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#475569',
  },
  dividerText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  googleBtn: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  googleBtnText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  switchBtn: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: '#5eead4',
    fontSize: 14,
  },
});
