import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../contexts/TransactionsContext';
import type { MainStackParamList, TabParamList } from '../navigation/types';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = Math.min(SCREEN_W - 48, 340);

const PALETTE = ['#2dd4bf', '#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#fb923c'];

type TabKey = 'summary' | 'charts';

export function DashboardScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<TabParamList, 'Dashboard'>>();
  const { logout } = useAuth();
  const { analytics, analyticsLoading, refreshAll, listRefreshing } = useTransactions();
  const [tab, setTab] = useState<TabKey>('summary');

  const summaryOpacity = useRef(new Animated.Value(1)).current;
  const chartsOpacity = useRef(new Animated.Value(0)).current;
  const chartReveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(summaryOpacity, {
        toValue: tab === 'summary' ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(chartsOpacity, {
        toValue: tab === 'charts' ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [tab, summaryOpacity, chartsOpacity]);

  useEffect(() => {
    chartReveal.setValue(0);
    if (!analyticsLoading) {
      Animated.spring(chartReveal, {
        toValue: 1,
        useNativeDriver: true,
        friction: 7,
      }).start();
    }
  }, [analyticsLoading, analytics.balance, chartReveal]);

  const barData = useMemo(() => {
    return analytics.byCategory.slice(0, 6).map((c, i) => ({
      value: Math.round(c.total * 100) / 100,
      label: c.category.length > 6 ? `${c.category.slice(0, 5)}…` : c.category,
      frontColor: PALETTE[i % PALETTE.length]!,
    }));
  }, [analytics.byCategory]);

  const pieData = useMemo(() => {
    return analytics.byCategory.slice(0, 6).map((c, i) => ({
      value: Math.round(c.total * 100) / 100,
      color: PALETTE[i % PALETTE.length]!,
      text: c.category,
    }));
  }, [analytics.byCategory]);

  const formatMoney = useCallback((n: number) => {
    return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  }, []);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
          <Pressable onPress={() => logout()} hitSlop={8}>
            <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Out</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, logout]);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={listRefreshing}
          onRefresh={refreshAll}
          tintColor="#2dd4bf"
        />
      }
    >
      <Text style={styles.heading}>Overview</Text>

      <View style={styles.tabRow}>
        {(['summary', 'charts'] as const).map((k) => (
          <Pressable
            key={k}
            style={[styles.tab, tab === k && styles.tabOn]}
            onPress={() => setTab(k)}
          >
            <Text style={[styles.tabText, tab === k && styles.tabTextOn]}>
              {k === 'summary' ? 'Summary' : 'Charts'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionWrap}>
        <Animated.View
          style={[styles.absSection, { opacity: summaryOpacity }]}
          pointerEvents={tab === 'summary' ? 'auto' : 'none'}
        >
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total balance</Text>
            <Text
              style={[
                styles.cardValue,
                analytics.balance >= 0 ? styles.pos : styles.neg,
              ]}
            >
              {formatMoney(analytics.balance)}
            </Text>
          </View>
          <View style={styles.row2}>
            <View style={[styles.card, styles.half]}>
              <Text style={styles.cardLabel}>Income</Text>
              <Text style={[styles.cardValue, styles.pos]}>
                {formatMoney(analytics.totalIncome)}
              </Text>
            </View>
            <View style={[styles.card, styles.half]}>
              <Text style={styles.cardLabel}>Expenses</Text>
              <Text style={[styles.cardValue, styles.neg]}>
                {formatMoney(analytics.totalExpense)}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[styles.absSection, { opacity: chartsOpacity }]}
          pointerEvents={tab === 'charts' ? 'auto' : 'none'}
        >
          <Animated.View
            style={{
              opacity: chartReveal,
              transform: [
                {
                  translateY: chartReveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={styles.chartTitle}>Spending by category</Text>
            {pieData.length > 0 ? (
              <View style={styles.chartBox}>
                <PieChart
                  data={pieData}
                  radius={90}
                  innerRadius={42}
                  innerCircleColor="#1e293b"
                  centerLabelComponent={() => (
                    <Text style={styles.pieCenter}>Expenses</Text>
                  )}
                />
              </View>
            ) : (
              <Text style={styles.empty}>No expense data yet. Add transactions.</Text>
            )}

            {barData.length > 0 ? (
              <View style={[styles.chartBox, { marginTop: 8 }]}>
                <BarChart
                  data={barData}
                  width={CHART_W}
                  height={220}
                  barWidth={28}
                  spacing={18}
                  roundedTop
                  roundedBottom
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisTextStyle={{ color: '#94a3b8', fontSize: 11 }}
                  xAxisLabelTextStyle={{ color: '#94a3b8', fontSize: 10 }}
                  noOfSections={4}
                  maxValue={Math.max(
                    ...barData.map((b) => b.value),
                    1
                  )}
                  isAnimated
                  animationDuration={600}
                />
              </View>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabOn: { backgroundColor: '#0f172a' },
  tabText: { color: '#64748b', fontWeight: '600' },
  tabTextOn: { color: '#5eead4' },
  sectionWrap: {
    minHeight: 420,
    position: 'relative',
  },
  absSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  half: { flex: 1 },
  row2: { flexDirection: 'row', gap: 12 },
  cardLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 6 },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#f8fafc' },
  pos: { color: '#5eead4' },
  neg: { color: '#fca5a5' },
  chartTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartBox: {
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pieCenter: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  empty: { color: '#64748b', fontSize: 14, paddingVertical: 24, textAlign: 'center' },
});
