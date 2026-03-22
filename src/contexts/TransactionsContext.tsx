import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { DocumentSnapshot } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import type { Transaction, TransactionFilters, TransactionInput } from '../types/transaction';
import {
  createTransaction,
  fetchTransactionsForAnalytics,
  fetchTransactionsPage,
  updateTransactionRecord,
} from '../services/transactionsRepository';

export type CategorySpend = { category: string; total: number };

export type DashboardAnalytics = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  byCategory: CategorySpend[];
};

type TransactionsContextValue = {
  filters: TransactionFilters;
  setFilters: React.Dispatch<React.SetStateAction<TransactionFilters>>;
  transactions: Transaction[];
  listLoading: boolean;
  listLoadingMore: boolean;
  listRefreshing: boolean;
  hasMore: boolean;
  analytics: DashboardAnalytics;
  analyticsLoading: boolean;
  refreshAll: () => Promise<void>;
  loadInitialPage: () => Promise<void>;
  loadMore: () => Promise<void>;
  addTransaction: (input: TransactionInput) => Promise<string>;
  updateTransaction: (id: string, input: TransactionInput) => Promise<void>;
};

const defaultFilters: TransactionFilters = {
  type: 'all',
  category: 'all',
  dateFrom: null,
  dateTo: null,
};

const TransactionsContext = createContext<TransactionsContextValue | undefined>(
  undefined
);

function computeAnalytics(rows: Transaction[]): DashboardAnalytics {
  let totalIncome = 0;
  let totalExpense = 0;
  const catMap = new Map<string, number>();

  for (const t of rows) {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpense += t.amount;
    }
    const prev = catMap.get(t.category) ?? 0;
    catMap.set(
      t.category,
      prev + (t.type === 'expense' ? t.amount : 0)
    );
  }

  const byCategory: CategorySpend[] = [...catMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return {
    balance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    byCategory,
  };
}

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const uid = user?.uid;

  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listLoadingMore, setListLoadingMore] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<DocumentSnapshot<DocumentData> | null>(null);

  const [analyticsRows, setAnalyticsRows] = useState<Transaction[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        type: filters.type,
        category: filters.category,
        from: filters.dateFrom?.toISOString() ?? null,
        to: filters.dateTo?.toISOString() ?? null,
      }),
    [filters]
  );

  const loadAnalytics = useCallback(async () => {
    if (!uid || !authReady) {
      setAnalyticsRows([]);
      return;
    }
    setAnalyticsLoading(true);
    try {
      const rows = await fetchTransactionsForAnalytics(uid);
      setAnalyticsRows(rows);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [uid, authReady]);

  const loadInitialPage = useCallback(async () => {
    if (!uid || !authReady) {
      setTransactions([]);
      setHasMore(false);
      return;
    }
    setListLoading(true);
    cursorRef.current = null;
    try {
      const { items, lastDoc } = await fetchTransactionsPage(uid, filters, null);
      setTransactions(items);
      cursorRef.current = lastDoc;
      setHasMore(lastDoc !== null);
    } finally {
      setListLoading(false);
    }
  }, [uid, authReady, filters]);

  const loadMore = useCallback(async () => {
    if (!uid || !authReady || !hasMore || listLoadingMore || !cursorRef.current) {
      return;
    }
    setListLoadingMore(true);
    try {
      const { items, lastDoc } = await fetchTransactionsPage(
        uid,
        filters,
        cursorRef.current
      );
      setTransactions((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        const merged = [...prev];
        for (const t of items) {
          if (!seen.has(t.id)) {
            seen.add(t.id);
            merged.push(t);
          }
        }
        return merged;
      });
      cursorRef.current = lastDoc;
      setHasMore(lastDoc !== null);
    } finally {
      setListLoadingMore(false);
    }
  }, [uid, authReady, hasMore, listLoadingMore, filters]);

  const refreshAll = useCallback(async () => {
    if (!uid || !authReady) {
      return;
    }
    setListRefreshing(true);
    try {
      await Promise.all([loadInitialPage(), loadAnalytics()]);
    } finally {
      setListRefreshing(false);
    }
  }, [uid, authReady, loadInitialPage, loadAnalytics]);

  useEffect(() => {
    if (!uid || !authReady) {
      setTransactions([]);
      setAnalyticsRows([]);
      cursorRef.current = null;
      setHasMore(false);
      return;
    }
    loadInitialPage();
    loadAnalytics();
  }, [uid, authReady, filtersKey, loadInitialPage, loadAnalytics]);

  const addTransaction = useCallback(
    async (input: TransactionInput) => {
      if (!uid) {
        throw new Error('Not signed in');
      }
      const id = await createTransaction(uid, input);
      await refreshAll();
      return id;
    },
    [uid, refreshAll]
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput) => {
      if (!uid) {
        throw new Error('Not signed in');
      }
      await updateTransactionRecord(uid, id, input);
      await refreshAll();
    },
    [uid, refreshAll]
  );

  const analytics = useMemo(
    () => computeAnalytics(analyticsRows),
    [analyticsRows]
  );

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      transactions,
      listLoading,
      listLoadingMore,
      listRefreshing,
      hasMore,
      analytics,
      analyticsLoading,
      refreshAll,
      loadInitialPage,
      loadMore,
      addTransaction,
      updateTransaction,
    }),
    [
      filters,
      transactions,
      listLoading,
      listLoadingMore,
      listRefreshing,
      hasMore,
      analytics,
      analyticsLoading,
      refreshAll,
      loadInitialPage,
      loadMore,
      addTransaction,
      updateTransaction,
    ]
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions(): TransactionsContextValue {
  const ctx = useContext(TransactionsContext);
  if (!ctx) {
    throw new Error('useTransactions must be used within TransactionsProvider');
  }
  return ctx;
}
