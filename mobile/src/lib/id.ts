/** Random id without native crypto — safe for React Native / Expo. */
export function generateId(): string {
  const part = () => Math.random().toString(36).slice(2, 11);
  return `${Date.now().toString(36)}-${part()}-${part()}`;
}
