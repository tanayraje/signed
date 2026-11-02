/** Questions a friend asked that you've chosen to answer in your next letter to them. Kept on this phone. */
export interface ToAnswer { key: string; question: string; letter_id: string }
export interface Answer { question: string; answer: string; letter_id: string }

const k = (friendId: string) => `signed.toAnswer.${friendId}`;

export function toAnswer(friendId: string): ToAnswer[] {
  try { return JSON.parse(localStorage.getItem(k(friendId)) || '[]') as ToAnswer[]; } catch { return []; }
}
export function setToAnswer(friendId: string, list: ToAnswer[]) {
  try { localStorage.setItem(k(friendId), JSON.stringify(list)); } catch { /* storage blocked */ }
}
export function toggleAnswer(friendId: string, q: ToAnswer): boolean {
  const list = toAnswer(friendId);
  const on = list.some((x) => x.key === q.key);
  setToAnswer(friendId, on ? list.filter((x) => x.key !== q.key) : [...list, q]);
  return !on;
}
