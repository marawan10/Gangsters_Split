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
  'El Maro': 'marwan_mokhtar10',
  'El Kemo': 'kim0mo',
  'El Back': 'mohamed4hmed',
};

export function getInstapayUrl(user) {
  const username = INSTAPAY[user];
  if (!username) return null;
  return `https://ipn.eg/S/${username}/instapay`;
}
