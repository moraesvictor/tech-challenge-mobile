import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../contexts/TransactionsContext';
import {
  TransactionFormFields,
  emptyFormState,
  formStateToInput,
  stateFromTransaction,
  validateTransactionForm,
  type TransactionFormState,
} from '../components/TransactionFormFields';
import type { MainStackParamList } from '../navigation/types';
import { getTransaction } from '../services/transactionsRepository';

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionForm'>;

export function TransactionFormScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { addTransaction, updateTransaction } = useTransactions();
  const transactionId = route.params?.transactionId;

  const [form, setForm] = useState<TransactionFormState>(emptyFormState());
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'title' | 'amount' | 'category' | 'date', string>>
  >({});
  const [loading, setLoading] = useState(Boolean(transactionId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!transactionId || !user?.uid) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const t = await getTransaction(user.uid, transactionId);
        if (!cancelled && t) {
          setForm(stateFromTransaction(t));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [transactionId, user?.uid]);

  const onSave = useCallback(async () => {
    const errors = validateTransactionForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    const input = formStateToInput(form);
    setSaving(true);
    try {
      if (!transactionId) {
        await addTransaction(input);
      } else {
        await updateTransaction(transactionId, input);
      }
      navigation.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  }, [addTransaction, form, navigation, transactionId, updateTransaction]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2dd4bf" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TransactionFormFields value={form} onChange={setForm} fieldErrors={fieldErrors} />
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, saving && styles.btnDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.saveTxt}>{transactionId ? 'Save changes' : 'Create'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    backgroundColor: '#1e293b',
  },
  saveBtn: {
    backgroundColor: '#2dd4bf',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  saveTxt: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
});
