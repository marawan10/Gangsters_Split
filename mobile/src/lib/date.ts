type TFn = (key: string, vars?: Record<string, string>) => string;

export function formatDateLocalized(timestamp: number, t: TFn): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) {
    const hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? t('pm') : t('am');
    const h = hours % 12 || 12;
    return t('todayAt', { time: `${h}:${mins} ${ampm}` });
  }
  if (diffDays === 1) return t('yesterday');
  if (diffDays < 7) return t('daysAgo', { n: String(diffDays) });
  const months = t('months') as unknown as string[];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function formatGroupDate(dateStr: string, t: TFn): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr === today) return t('today');
  const months = t('months') as unknown as string[];
  return `${months[m - 1]} ${d}`;
}
