export type CategoryId = 'food' | 'transport' | 'shopping' | 'bills' | 'others';

export interface Expense {
  id: string;
  fbKey?: string;
  item: string;
  category: CategoryId;
  amount: number;
  participants: string[];
  paidBy: Record<string, number>;
  totalPaid: number;
  addedBy: string;
  createdAt: number;
  archivedAt?: number;
}

export type SettlementStatus = 'pending' | 'sent' | 'settled';

export interface Settlement {
  fbKey?: string;
  from: string;
  to: string;
  amount: number;
  status: SettlementStatus;
  createdAt: number;
  sentAt?: number;
  settledAt?: number;
}

export interface InstapayInfo {
  username: string;
  url: string;
}

export interface Member {
  id: string;
  name: string;
  isAdmin?: boolean;
  instapay?: InstapayInfo;
  color?: string;
}

export interface IdentityClaim {
  memberId: string;
  name: string;
  deviceId: string;
  claimedAt: number;
}

export interface ExpenseBreakdown {
  share: number;
  paid: number;
  net: number;
}

export type Lang = 'en' | 'ar';
