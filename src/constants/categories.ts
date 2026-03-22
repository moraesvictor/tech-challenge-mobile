export const TRANSACTION_CATEGORIES = [
  'Food',
  'Transport',
  'Salary',
  'Entertainment',
  'Health',
  'Shopping',
  'Bills',
  'Other',
] as const;

export type CategoryId = (typeof TRANSACTION_CATEGORIES)[number];
