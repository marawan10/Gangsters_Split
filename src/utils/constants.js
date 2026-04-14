export const USERS = ['El Maro', 'El Kemo', 'El Back'];
export const STORAGE_KEY = 'gangsters-expenses';

export const CATEGORIES = [
  { id: 'food', label: 'Food', emoji: '🍔' },
  { id: 'transport', label: 'Transport', emoji: '🚗' },
  { id: 'shopping', label: 'Shopping', emoji: '🛒' },
  { id: 'bills', label: 'Bills', emoji: '📄' },
  { id: 'others', label: 'Others', emoji: '📦' },
];

export const INSTAPAY = {
  'El Maro': { username: 'marwan_mokhtar10', url: 'https://ipn.eg/S/marwan_mokhtar10/instapay/0D3OyF' },
  'El Kemo': { username: 'kim0mo', url: 'https://ipn.eg/S/kim0mo/instapay/0agQfX' },
  'El Back': { username: 'mohamed4hmed', url: 'https://ipn.eg/S/mohamed4hmed/instapay/6WET1L' },
};

/** Best-effort amount in URL (InstaPay may ignore). */
export function buildInstapayPayUrl(baseUrl, amount) {
  if (!baseUrl || amount == null || amount <= 0) return baseUrl;
  try {
    const u = new URL(baseUrl);
    u.searchParams.set('amount', (Math.round(amount * 100) / 100).toFixed(2));
    return u.href;
  } catch {
    return baseUrl;
  }
}

