export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  TransactionForm: { transactionId?: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
};
