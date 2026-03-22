export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: Date;
  type: TransactionType;
  receiptUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionFilters {
  type: TransactionType | 'all';
  category: string | 'all';
  dateFrom: Date | null;
  dateTo: Date | null;
}

export interface TransactionInput {
  title: string;
  amount: number;
  category: string;
  date: Date;
  type: TransactionType;
  receiptUrl?: string | null;
}
