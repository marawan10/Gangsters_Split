import type { CategoryId, Member } from './types';

export const ADMIN_NAME = 'El Maro';

export const IDENTITY_KEY = 'gangsters-identity';
export const DEVICE_ID_KEY = 'gangsters-device-id';
export const DARK_KEY = 'gangsters-dark';
export const LANG_KEY = 'gangsters-lang';

export const CATEGORIES: { id: CategoryId; label: string; emoji: string }[] = [
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'shopping', label: 'Shopping', emoji: '🛒' },
  { id: 'bills', label: 'Bills', emoji: '📄' },
  { id: 'others', label: 'Others', emoji: '📦' },
];

export const MEMBER_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#3B82F6'];

export const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'maro',
    name: 'El Maro',
    isAdmin: true,
    color: '#6366F1',
    instapay: {
      username: 'marwan_mokhtar10',
      url: 'https://ipn.eg/S/marwan_mokhtar10/instapay/0D3OyF',
    },
  },
  {
    id: 'kemo',
    name: 'El Kemo',
    color: '#8B5CF6',
    instapay: {
      username: 'kim0mo',
      url: 'https://ipn.eg/S/kim0mo/instapay/0agQfX',
    },
  },
  {
    id: 'back',
    name: 'El Back',
    color: '#EC4899',
    instapay: {
      username: 'mohamed4hmed',
      url: 'https://ipn.eg/S/mohamed4hmed/instapay/6WET1L',
    },
  },
  {
    id: 'abdo',
    name: 'Abdo',
    color: '#14B8A6',
  },
];

export function memberNames(members: Member[]): string[] {
  return members.map((m) => m.name);
}

export function buildInstapayPayUrl(baseUrl: string, amount: number | null | undefined): string {
  if (!baseUrl || amount == null || amount <= 0) return baseUrl;
  try {
    const u = new URL(baseUrl);
    u.searchParams.set('amount', (Math.round(amount * 100) / 100).toFixed(2));
    return u.href;
  } catch {
    return baseUrl;
  }
}

export function getMemberInstapay(members: Member[], name: string) {
  return members.find((m) => m.name === name)?.instapay;
}
