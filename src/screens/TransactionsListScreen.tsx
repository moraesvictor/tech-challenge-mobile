import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTransactions } from '../contexts/TransactionsContext';
import type { MainStackParamList, TabParamList } from '../navigation/types';
import type { Transaction } from '../types/transaction';
import { TRANSACTION_CATEGORIES } from '../constants/categories';

function formatMoney(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function TransactionRow({
  item,
  onPress,
}: {
  item: Transaction;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text
          style={[
            styles.rowAmount,
            item.type === 'income' ? styles.income : styles.expense,
          ]}
        >
          {item.type === 'income' ? '+' : '−'}
          {formatMoney(item.amount)}
        </Text>
      </View>
      <View style={styles.rowMeta}>
        <Text style={styles.meta}>{item.category}</Text>
        <Text style={styles.meta}>{item.date.toLocaleDateString()}</Text>
        <Text style={styles.meta}>{item.type === 'income' ? 'Income' : 'Expense'}</Text>
      </View>
    </Pressable>
  );
}

export function TransactionsListScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList, 'Transactions'>>();
  const {
    transactions,
    filters,
    setFilters,
    listLoading,
    listLoadingMore,
    listRefreshing,
    hasMore,
    loadMore,
    refreshAll,
  } = useTransactions();

  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');

  const visibleTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return transactions;
    }
    return transactions.filter((t) => t.title.toLowerCase().includes(q));
  }, [transactions, search]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable onPress={() => setFilterOpen(true)} hitSlop={8}>
            <Text style={{ color: '#2dd4bf', fontWeight: '700' }}>Filter</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const stack =
                navigation.getParent<NativeStackNavigationProp<MainStackParamList>>();
              stack?.navigate('TransactionForm', {});
            }}
            hitSlop={8}
          >
            <Text style={{ color: '#2dd4bf', fontWeight: '700' }}>Add</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const onEndReached = useCallback(() => {
    if (!listLoading && !listLoadingMore && hasMore) {
      loadMore();
    }
  }, [hasMore, listLoading, listLoadingMore, loadMore]);

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        item={item}
        onPress={() => {
          const stack =
            navigation.getParent<NativeStackNavigationProp<MainStackParamList>>();
          stack?.navigate('TransactionForm', { transactionId: item.id });
        }}
      />
    ),
    [navigation]
  );

  const listEmpty = useMemo(() => {
    if (listLoading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color="#2dd4bf" />
        </View>
      );
    }
    if (transactions.length === 0) {
      return (
        <Text style={styles.empty}>No transactions match these filters.</Text>
      );
    }
    return (
      <Text style={styles.empty}>No transactions match your search.</Text>
    );
  }, [listLoading, transactions.length]);

  return (
    <View style={styles.root}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title…"
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={visibleTransactions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          listLoadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#2dd4bf" />
          ) : null
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={listRefreshing}
            onRefresh={refreshAll}
            tintColor="#2dd4bf"
          />
        }
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={7}
      />

      <Modal visible={filterOpen} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filters</Text>

            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.chipRow}>
              {(['all', 'income', 'expense'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, filters.type === t && styles.chipOn]}
                  onPress={() => setFilters((f) => ({ ...f, type: t }))}
                >
                  <Text style={[styles.chipTxt, filters.type === t && styles.chipTxtOn]}>
                    {t === 'all' ? 'All' : t === 'income' ? 'Income' : 'Expense'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.filterLabel}>Category</Text>
            <View style={styles.chipRowWrap}>
              <Pressable
                style={[styles.chip, filters.category === 'all' && styles.chipOn]}
                onPress={() => setFilters((f) => ({ ...f, category: 'all' }))}
              >
                <Text
                  style={[styles.chipTxt, filters.category === 'all' && styles.chipTxtOn]}
                >
                  All
                </Text>
              </Pressable>
              {TRANSACTION_CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.chip, filters.category === c && styles.chipOn]}
                  onPress={() => setFilters((f) => ({ ...f, category: c }))}
                >
                  <Text
                    style={[styles.chipTxt, filters.category === c && styles.chipTxtOn]}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.filterLabel}>Date range</Text>
            <Text style={styles.hint}>
              Set both start and end to filter by transaction date in Firestore.
            </Text>
            <View style={styles.dateRow}>
              <Pressable
                style={styles.dateBtn}
                onPress={() =>
                  setFilters((f) => ({
                    ...f,
                    dateFrom: new Date(new Date().setDate(1)),
                    dateTo: new Date(),
                  }))
                }
              >
                <Text style={styles.dateBtnTxt}>This month</Text>
              </Pressable>
              <Pressable
                style={styles.dateBtn}
                onPress={() =>
                  setFilters((f) => ({ ...f, dateFrom: null, dateTo: null }))
                }
              >
                <Text style={styles.dateBtnTxt}>Clear dates</Text>
              </Pressable>
            </View>
            {filters.dateFrom && filters.dateTo ? (
              <Text style={styles.rangeTxt}>
                {filters.dateFrom.toLocaleDateString()} —{' '}
                {filters.dateTo.toLocaleDateString()}
              </Text>
            ) : (
              <Text style={styles.rangeTxtMuted}>No date range (ordered by created date)</Text>
            )}

            <Pressable style={styles.doneBtn} onPress={() => setFilterOpen(false)}>
              <Text style={styles.doneBtnTxt}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  row: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowTitle: { flex: 1, color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  rowAmount: { fontSize: 16, fontWeight: '700' },
  income: { color: '#5eead4' },
  expense: { color: '#fca5a5' },
  rowMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  meta: { color: '#94a3b8', fontSize: 12 },
  center: { paddingTop: 48, alignItems: 'center' },
  empty: { color: '#64748b', textAlign: 'center', marginTop: 48, fontSize: 15 },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  filterLabel: { color: '#cbd5e1', marginTop: 12, marginBottom: 8, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipOn: { borderColor: '#2dd4bf', backgroundColor: '#134e4a' },
  chipTxt: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  chipTxtOn: { color: '#ccfbf1' },
  hint: { color: '#64748b', fontSize: 12, marginBottom: 8 },
  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateBtnTxt: { color: '#e2e8f0', fontWeight: '600' },
  rangeTxt: { color: '#94a3b8', marginTop: 8, fontSize: 13 },
  rangeTxtMuted: { color: '#64748b', marginTop: 8, fontSize: 13 },
  doneBtn: {
    marginTop: 20,
    backgroundColor: '#2dd4bf',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnTxt: { color: '#0f172a', fontWeight: '700', fontSize: 16 },
});
