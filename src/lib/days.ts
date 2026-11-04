import type { Letter } from './types';

/** When a letter counts on the calendar: the day you sent it, or the day you opened theirs. */
export function dayOf(l: Letter, uid: string): number {
  return l.sender === uid ? new Date(l.sent_at).getTime() : l.opened_at ? new Date(l.opened_at).getTime() : -1;
}

/** Midnight (local) as YYYY-MM-DD, for links. */
export function dayKey(t: number | Date): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Every letter shared on a day, in the order it happened. */
export function lettersOn(letters: Letter[], uid: string, key: string): Letter[] {
  const [y, m, d] = key.split('-').map(Number);
  const a = new Date(y, m - 1, d).getTime(), b = new Date(y, m - 1, d + 1).getTime();
  return letters.filter((l) => { const t = dayOf(l, uid); return t >= a && t < b; }).sort((x, z) => dayOf(x, uid) - dayOf(z, uid));
}
