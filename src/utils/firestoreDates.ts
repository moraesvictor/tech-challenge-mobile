import {
  Timestamp,
  type DocumentData,
  type DocumentSnapshot,
} from 'firebase/firestore';
import type { Transaction, TransactionType } from '../types/transaction';

export function toDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  return new Date();
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function mapDocToTransaction(
  doc: DocumentSnapshot<DocumentData>
): Transaction {
  const data = doc.data();
  if (!data) {
    throw new Error('Missing document data');
  }
  return {
    id: doc.id,
    title: String(data.title ?? ''),
    amount: Number(data.amount ?? 0),
    category: String(data.category ?? ''),
    date: toDate(data.date),
    type: (data.type === 'income' ? 'income' : 'expense') as TransactionType,
    receiptUrl:
      typeof data.receiptUrl === 'string' && data.receiptUrl.length > 0
        ? data.receiptUrl
        : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}
