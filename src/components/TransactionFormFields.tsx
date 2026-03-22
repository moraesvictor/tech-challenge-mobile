import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { TRANSACTION_CATEGORIES } from '../constants/categories';
import type { Transaction, TransactionInput, TransactionType } from '../types/transaction';

export type TransactionFormState = {
  title: string;
  amount: string;
  category: string;
  date: Date;
  type: TransactionType;
  receiptUrl: string | null;
};

const defaultDate = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
};

export function emptyFormState(): TransactionFormState {
  return {
    title: '',
    amount: '',
    category: '',
    date: defaultDate(),
    type: 'expense',
    receiptUrl: null,
  };
}

export function stateFromTransaction(t: Transaction): TransactionFormState {
  return {
    title: t.title,
    amount: String(t.amount),
    category: t.category,
    date: new Date(t.date),
    type: t.type,
    receiptUrl: t.receiptUrl,
  };
}

export type FieldErrors = Partial<Record<'title' | 'amount' | 'category' | 'date', string>>;

export function validateTransactionForm(state: TransactionFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!state.title.trim()) {
    errors.title = 'Title is required.';
  }
  const raw = state.amount.replace(',', '.').trim();
  const num = Number.parseFloat(raw);
  if (!raw) {
    errors.amount = 'Amount is required.';
  } else if (Number.isNaN(num)) {
    errors.amount = 'Amount must be numeric.';
  } else if (num <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  }
  if (!state.category.trim()) {
    errors.category = 'Category is required.';
  }
  if (!state.date || Number.isNaN(state.date.getTime())) {
    errors.date = 'Date is required.';
  }
  return errors;
}

export function formStateToInput(state: TransactionFormState): TransactionInput {
  const raw = state.amount.replace(',', '.').trim();
  return {
    title: state.title.trim(),
    amount: Number.parseFloat(raw),
    category: state.category.trim(),
    date: state.date,
    type: state.type,
    receiptUrl: state.receiptUrl,
  };
}

type Props = {
  value: TransactionFormState;
  onChange: (next: TransactionFormState) => void;
  fieldErrors: FieldErrors;
  onReceiptSelected: (asset: DocumentPicker.DocumentPickerAsset) => void;
  receiptNote?: string | null;
};

export function TransactionFormFields({
  value,
  onChange,
  fieldErrors,
  onReceiptSelected,
  receiptNote,
}: Props) {
  const [showDate, setShowDate] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const onDateChange = useCallback(
    (_: DateTimePickerEvent, selected?: Date) => {
      setShowDate(false);
      if (selected) {
        onChange({ ...value, date: selected });
      }
    },
    [onChange, value]
  );

  const categoryLabel = useMemo(() => {
    return value.category || 'Select category';
  }, [value.category]);

  const pickFile = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) {
      return;
    }
    onReceiptSelected(res.assets[0]);
  }, [onReceiptSelected]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Grocery run"
        placeholderTextColor="#64748b"
        value={value.title}
        onChangeText={(title) => onChange({ ...value, title })}
      />
      {fieldErrors.title ? <Text style={styles.err}>{fieldErrors.title}</Text> : null}

      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        placeholder="0.00"
        placeholderTextColor="#64748b"
        keyboardType="decimal-pad"
        value={value.amount}
        onChangeText={(amount) => onChange({ ...value, amount })}
      />
      {fieldErrors.amount ? <Text style={styles.err}>{fieldErrors.amount}</Text> : null}

      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {(['expense', 'income'] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, value.type === t && styles.chipOn]}
            onPress={() => onChange({ ...value, type: t })}
          >
            <Text style={[styles.chipText, value.type === t && styles.chipTextOn]}>
              {t === 'income' ? 'Income' : 'Expense'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Category</Text>
      <Pressable style={styles.inputLike} onPress={() => setCatOpen(true)}>
        <Text style={value.category ? styles.inputText : styles.placeholder}>
          {categoryLabel}
        </Text>
      </Pressable>
      {fieldErrors.category ? <Text style={styles.err}>{fieldErrors.category}</Text> : null}

      <Text style={styles.label}>Date</Text>
      <Pressable style={styles.inputLike} onPress={() => setShowDate(true)}>
        <Text style={styles.inputText}>{value.date.toLocaleDateString()}</Text>
      </Pressable>
      {fieldErrors.date ? <Text style={styles.err}>{fieldErrors.date}</Text> : null}

      {showDate ? (
        <DateTimePicker value={value.date} mode="date" onChange={onDateChange} />
      ) : null}

      <Text style={styles.label}>Receipt (optional)</Text>
      <Pressable style={styles.secondaryBtn} onPress={pickFile}>
        <Text style={styles.secondaryBtnText}>
          {value.receiptUrl ? 'Replace receipt' : 'Attach receipt'}
        </Text>
      </Pressable>
      {receiptNote ? (
        <Text style={styles.hint} numberOfLines={2}>
          {receiptNote}
        </Text>
      ) : null}

      <Modal visible={catOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setCatOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Category</Text>
            {TRANSACTION_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                style={styles.modalRow}
                onPress={() => {
                  onChange({ ...value, category: c });
                  setCatOpen(false);
                }}
              >
                <Text style={styles.modalRowText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
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
  inputLike: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputText: { color: '#f8fafc', fontSize: 16 },
  placeholder: { color: '#64748b', fontSize: 16 },
  err: { color: '#f87171', fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipOn: {
    backgroundColor: '#134e4a',
    borderColor: '#2dd4bf',
  },
  chipText: { color: '#94a3b8', fontWeight: '600' },
  chipTextOn: { color: '#ccfbf1' },
  secondaryBtn: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  secondaryBtnText: { color: '#e2e8f0', fontWeight: '600' },
  hint: { color: '#64748b', fontSize: 12, marginTop: 6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 8,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  modalRowText: { color: '#e2e8f0', fontSize: 16 },
});
