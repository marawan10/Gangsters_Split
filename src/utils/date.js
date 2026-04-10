export function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();

  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    const hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `Today, ${h}:${mins} ${ampm}`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export function formatDateLocalized(timestamp, t) {
  const date = new Date(timestamp);
  const now = new Date();

  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    const hours = date.getHours();
    const mins = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? t('pm') : t('am');
    const h = hours % 12 || 12;
    return t('todayAt', { time: `${h}:${mins} ${ampm}` });
  }
  if (diffDays === 1) return t('yesterday');
  if (diffDays < 7) return t('daysAgo', { n: diffDays });

  const months = t('months');
  return `${months[date.getMonth()]} ${date.getDate()}`;
}
