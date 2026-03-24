# App financeiro mobile (Expo + Firebase)

App React Native orientado a produção, com **Expo**, para finanças pessoais: **Firebase Authentication** (e-mail/senha, **Google** via OAuth + `signInWithCredential`, sessões persistidas), **Cloud Firestore** para transações por usuário (**Firebase Storage não é usado** — sem upload de arquivos, sem API de Storage), **React Context** para `Auth` e `Transactions`, dashboards com **react-native-gifted-charts**, transições **Animated** no dashboard, **FlatList** com **scroll infinito** (paginação por cursor no Firestore), filtros, busca local por título nas páginas carregadas e formulário compartilhado de **inclusão/edição**.

## Pré-requisitos

- **Node.js** 20 LTS ou mais recente (Expo SDK 55 espera Node ≥ 20.19.4).
- **npm** (ou yarn/pnpm).
- **Expo Go** no dispositivo, ou emulador (Android Studio / Xcode).

## Instalar dependências

```bash
npm install
```

## Configurar o Firebase

### 1. Criar um projeto no Firebase

1. Abra o [Console do Firebase](https://console.firebase.google.com/) e crie um projeto.
2. Em **Configurações do projeto**, adicione um app (Web) para obter o objeto de configuração do cliente.

### 2. Habilitar Authentication

1. Vá em **Build → Authentication → Sign-in method**.
2. Abra **E-mail/senha** e **ative** o primeiro interruptor (“Permitir que os usuários registrem com e-mail e senha”). Só “link de e-mail” ativado **não** basta para este app — o erro `auth/OPERATION_NOT_ALLOWED` costuma ser isso.
3. Para **Continuar com Google**: em **Sign-in method**, ative **Google**, configure a tela de consentimento OAuth se o console pedir, e salve.
4. Salve as alterações em cada provedor que você editou.

**Se o login falhar no navegador (Expo Web, ex.: `http://localhost:8082`):**

- **Authentication → Settings → Authorized domains:** inclua `localhost` (costuma vir por padrão).
- **Google Cloud Console → APIs e serviços → Credenciais → sua chave de API:** se houver **restrição por referenciador HTTP**, adicione `http://localhost:*/*` e `http://127.0.0.1:*/*` para desenvolvimento, ou use “Nenhuma” só enquanto testa.
- No DevTools → **Rede**, abra a resposta do `accounts:signInWithPassword` / `accounts:signUp` e leia o `message` (ex.: `OPERATION_NOT_ALLOWED` = e-mail/senha desativado; `API key not valid` = restrição da chave).

### 3. Criar o Cloud Firestore

1. Vá em **Build → Firestore Database**.
2. Crie o banco (modo produção é ok depois que as regras forem publicadas).
3. Publique as regras deste repositório para que cada usuário acesse só os próprios dados:

   - Arquivo de regras: `firebase/firestore.rules` (no repositório)
   - **Opção A — Console:** **Firestore → Regras**, cole o conteúdo do arquivo e **Publicar**.
   - **Opção B — CLI** (com [Firebase CLI](https://firebase.google.com/docs/cli) instalado e `firebase login`):

     ```bash
     firebase deploy --only firestore:rules
     ```

     O projeto padrão está em `.firebaserc` (`personal-finance-manager-1123c`). Para outro projeto: `firebase use --add`.

   Modelo dos dados:

   ```text
   users/{userId}/transactions/{transactionId}
   ```

   Cada documento de transação deve incluir: `title`, `amount`, `category`, `date` (timestamp), `type` (`income` | `expense`), `receiptUrl` (string ou null), `createdAt`, `updatedAt`.

### 4. Credenciais no app

O Firebase é configurado só por variáveis **`EXPO_PUBLIC_*`** no `.env` (veja `src/config/firebase.ts`). **Nunca faça commit** do `.env` nem cole chaves de API em arquivos versionados.

1. Copie o arquivo de exemplo:

   ```bash
   cp .env.example .env
   ```

2. Preencha com os valores da configuração do app Web (Configurações do projeto → Seus apps):

   | Variável | Corresponde ao campo do Firebase |
   |----------|----------------------------------|
   | `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
   | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
   | `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` (pode ficar vazio se não usar Storage) |
   | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
   | `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |
   | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | ID do cliente OAuth **Aplicativo da Web** no [Google Cloud Console](https://console.cloud.google.com/) → **APIs e serviços** → **Credenciais** (mesmo projeto GCP ligado ao Firebase; termina em `.apps.googleusercontent.com`). Obrigatório para o botão **Continuar com Google**. |
   | `EXPO_PUBLIC_EXPO_PROJECT_FULL_NAME` | **Recomendado no Expo Go** se aparecer **`redirect_uri_mismatch`:** `@seu-usuario-expo/mobile-app-financial` (usuário da conta **Expo**, não o e-mail do Google; slug = `slug` do `app.json`). Quando definido, o app usa **só** esse valor para montar `https://auth.expo.io/...` — deve ser **idêntico** ao URI que você cadastra no Google Cloud. |

3. **Google no app:** o fluxo usa `expo-auth-session` + Firebase `GoogleAuthProvider`. No **Google Cloud Console** → **Credenciais** → seu cliente OAuth **Aplicativo da Web** → **URIs de redirecionamento autorizados**, inclua **exatamente** o mesmo URI que o app usa:
   - **Expo Go:** `https://auth.expo.io/@SEU_USUARIO_EXPO/mobile-app-financial` (veja a mensagem de erro na tela de login se ainda der `redirect_uri_mismatch` — ela mostra o URI calculado).
   - **Expo Web (dev):** `http://localhost:8081` (ou a porta que o terminal do Expo mostrar, ex.: `8082`, `19006`).
   Se continuar em mismatch, defina **`EXPO_PUBLIC_EXPO_PROJECT_FULL_NAME=@SEU_USUARIO_EXPO/mobile-app-financial`** no `.env` (prioridade sobre o manifest), reinicie o Metro e **copie o mesmo** URI para o Google Cloud.

4. Reinicie o servidor de desenvolvimento depois de alterar o `.env` para o Expo carregar as variáveis `EXPO_PUBLIC_*`.

### 5. Índices compostos do Firestore (se o console pedir)

As consultas combinam `where` + `orderBy` (por exemplo `type` + `createdAt`, ou intervalo em `date` + `orderBy('date')`). Na primeira execução, o console do Firebase pode mostrar um erro com um **link para criar o índice composto necessário**. Siga esse link para cada índice sugerido.

## Executar o aplicativo

```bash
npx expo start
```

Depois pressione `a` (Android), `i` (simulador iOS) ou escaneie o QR code com o Expo Go.

Scripts npm equivalentes:

```bash
npm start
npm run android
npm run ios
```

### Celular não conecta (WSL2 / Windows)

Se o QR code apontar para um IP tipo `172.19.x.x` ou `172.x.x.x`, isso costuma ser a rede **interna do WSL**: o **celular na Wi‑Fi não alcança** esse endereço e o Expo Go dá erro ao abrir o projeto.

**Solução mais simples:** subir o Metro em modo túnel (usa a infra da Expo; pode ser um pouco mais lento):

```bash
npm run start:tunnel
```

Depois escaneie o QR code de novo no Expo Go.

**Alternativa:** usar o IP da sua máquina na rede local (o que aparece no `ipconfig` no Windows, ex.: `192.168.x.x`), com encaminhamento de porta da porta 8081 do Windows para o WSL, ou desenvolver a partir do Windows sem WSL para o bundler.

## Estrutura do projeto (visão geral)

| Caminho | Função |
|---------|--------|
| `src/config/firebase.ts` | App Firebase, Auth (persistência AsyncStorage), só Firestore |
| `src/contexts/AuthContext.tsx` | Login, cadastro, logout, usuário atual |
| `src/contexts/TransactionsContext.tsx` | Paginação da lista, filtros, snapshot de analytics, add/update |
| `src/services/transactionsRepository.ts` | I/O no Firestore |
| `src/screens/*` | Auth, Dashboard, lista de transações, formulário de transação (add/edit) |
| `src/navigation/AppNavigator.tsx` | Stack auth vs principal, abas, modal do formulário |
| `firebase/firestore.rules` | Regras de segurança do Firestore |

## Comportamento

- **Busca:** filtra **títulos** de transação entre os itens já carregados (e paginados) na lista; carregue mais para incluir correspondências mais antigas.
- **Comprovantes:** não há upload de arquivos; o campo `receiptUrl` no Firestore fica `null`.
- **Analytics do dashboard** usa o último bloco de transações (veja `ANALYTICS_LIMIT` em `transactionsRepository.ts`) para limitar leituras.

## Licença

Uso privado / educacional (trabalho FIAP).
