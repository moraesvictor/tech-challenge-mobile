import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
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
import { getTransaction, uploadReceipt } from '../services/transactionsRepository';

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
  const [uploading, setUploading] = useState(false);
  const [pendingReceipt, setPendingReceipt] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

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

  const receiptNote = useMemo(() => {
    if (pendingReceipt?.name) {
      return `Selected: ${pendingReceipt.name} (uploads when you save)`;
    }
    if (form.receiptUrl) {
      return 'Receipt is stored in Firebase Storage and linked to this transaction.';
    }
    return null;
  }, [form.receiptUrl, pendingReceipt]);

  const onReceiptSelected = useCallback(
    async (asset: DocumentPicker.DocumentPickerAsset) => {
      if (!user?.uid) {
        return;
      }
      if (!transactionId) {
        setPendingReceipt(asset);
        return;
      }
      setUploading(true);
      try {
        const url = await uploadReceipt(user.uid, transactionId, asset);
        let next: TransactionFormState | null = null;
        setForm((prev) => {
          next = { ...prev, receiptUrl: url };
          return next;
        });
        if (next) {
          await updateTransaction(transactionId, formStateToInput(next));
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        Alert.alert('Receipt', msg);
      } finally {
        setUploading(false);
      }
    },
    [transactionId, updateTransaction, user?.uid]
  );

  const onSave = useCallback(async () => {
    const errors = validateTransactionForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    const input = formStateToInput(form);
    setSaving(true);
    try {
      let id = transactionId ?? null;
      if (!id) {
        id = await addTransaction(input);
      } else {
        await updateTransaction(id, input);
      }
      if (pendingReceipt && user?.uid && id) {
        const url = await uploadReceipt(user.uid, id, pendingReceipt);
        await updateTransaction(id, { ...input, receiptUrl: url });
        setPendingReceipt(null);
      }
      navigation.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not save';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  }, [
    addTransaction,
    form,
    navigation,
    pendingReceipt,
    transactionId,
    updateTransaction,
    user?.uid,
  ]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2dd4bf" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {uploading ? (
        <View style={styles.uploadBanner}>
          <ActivityIndicator color="#0f172a" />
          <Text style={styles.uploadBannerTxt}>Uploading receipt…</Text>
        </View>
      ) : null}
      <TransactionFormFields
        value={form}
        onChange={setForm}
        fieldErrors={fieldErrors}
        onReceiptSelected={onReceiptSelected}
        receiptNote={receiptNote}
      />
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, (saving || uploading) && styles.btnDisabled]}
          onPress={onSave}
          disabled={saving || uploading}
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
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
    backgroundColor: '#2dd4bf',
  },
  uploadBannerTxt: { color: '#0f172a', fontWeight: '600' },
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
