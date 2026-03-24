import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  type DocumentSnapshot,
  type QueryConstraint,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../config/firebase';
import type {
  Transaction,
  TransactionFilters,
  TransactionInput,
} from '../types/transaction';
import { mapDocToTransaction, startOfDay, endOfDay } from '../utils/firestoreDates';

const PAGE_SIZE = 20;
const ANALYTICS_LIMIT = 400;

function transactionsCol(uid: string) {
  return collection(getFirestoreDb(), 'users', uid, 'transactions');
}

function buildListConstraints(filters: TransactionFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  const hasDate =
    filters.dateFrom != null &&
    filters.dateTo != null &&
    !Number.isNaN(filters.dateFrom.getTime()) &&
    !Number.isNaN(filters.dateTo.getTime());

  if (filters.type !== 'all') {
    constraints.push(where('type', '==', filters.type));
  }
  if (filters.category !== 'all') {
    constraints.push(where('category', '==', filters.category));
  }

  if (hasDate) {
    constraints.push(
      where('date', '>=', Timestamp.fromDate(startOfDay(filters.dateFrom!))),
      where('date', '<=', Timestamp.fromDate(endOfDay(filters.dateTo!))),
      orderBy('date', 'desc')
    );
    return constraints;
  }

  constraints.push(orderBy('createdAt', 'desc'));
  return constraints;
}

export async function fetchTransactionsPage(
  uid: string,
  filters: TransactionFilters,
  pageAfter: DocumentSnapshot | null
): Promise<{ items: Transaction[]; lastDoc: DocumentSnapshot | null }> {
  const constraints = buildListConstraints(filters);
  const base = query(transactionsCol(uid), ...constraints, limit(PAGE_SIZE));
  const q = pageAfter
    ? query(transactionsCol(uid), ...constraints, startAfter(pageAfter), limit(PAGE_SIZE))
    : base;

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => mapDocToTransaction(d));
  const last = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1]! : null;
  const hasMore = snap.docs.length === PAGE_SIZE;
  return {
    items,
    lastDoc: hasMore ? last : null,
  };
}

export async function fetchTransactionsForAnalytics(
  uid: string
): Promise<Transaction[]> {
  const q = query(
    transactionsCol(uid),
    orderBy('createdAt', 'desc'),
    limit(ANALYTICS_LIMIT)
  );
  const snap = await getDocs(q);
  return snap.docs.map(mapDocToTransaction);
}

export async function getTransaction(
  uid: string,
  transactionId: string
): Promise<Transaction | null> {
  const dRef = doc(getFirestoreDb(), 'users', uid, 'transactions', transactionId);
  const snap = await getDoc(dRef);
  if (!snap.exists()) {
    return null;
  }
  return mapDocToTransaction(snap);
}

export async function createTransaction(
  uid: string,
  input: TransactionInput
): Promise<string> {
  const now = Timestamp.now();
  const col = transactionsCol(uid);
  const docRef = await addDoc(col, {
    title: input.title.trim(),
    amount: input.amount,
    category: input.category,
    date: Timestamp.fromDate(input.date),
    type: input.type,
    receiptUrl: input.receiptUrl ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateTransactionRecord(
  uid: string,
  transactionId: string,
  input: TransactionInput
): Promise<void> {
  const dRef = doc(getFirestoreDb(), 'users', uid, 'transactions', transactionId);
  await updateDoc(dRef, {
    title: input.title.trim(),
    amount: input.amount,
    category: input.category,
    date: Timestamp.fromDate(input.date),
    type: input.type,
    receiptUrl: input.receiptUrl ?? null,
    updatedAt: Timestamp.now(),
  });
}

export { PAGE_SIZE };
