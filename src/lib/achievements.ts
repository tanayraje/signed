import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Friend, Letter } from './types';

/** What the achievements are worked out from. The server keeps these for you and your friends (seal_stats);
 *  if it can't answer, your own are worked out here from your letters. */
export interface SealStats {
  sealed: number;
  night_owl: boolean;
  long_haul: boolean;
  enchanted: boolean;
  same_day: boolean;
  pen_pal_weeks: number;
  friends: number;
  seasons: number;
  one_year: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: 'letter' | 'moon' | 'route' | 'wave' | 'clock' | 'calendar' | 'shelf' | 'leaf' | 'ring';
  reward?: string;              // a mix-in it unlocks
  progress?: (s: SealStats) => [number, number];
  done: (s: SealStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', title: 'First letter', desc: 'Sealed and sent a first letter.', icon: 'letter', done: (s) => s.sealed >= 1 },
  { id: 'night_owl', title: 'Night owl', desc: 'Sealed a letter after midnight.', icon: 'moon', reward: 'feather', done: (s) => s.night_owl },
  { id: 'long_haul', title: 'Long haul', desc: 'A letter flew over 1,000 km.', icon: 'route', reward: 'cornflower', done: (s) => s.long_haul },
  { id: 'enchanted', title: 'Enchanted', desc: 'Sent a letter in your own voice.', icon: 'wave', reward: 'babysbreath', done: (s) => s.enchanted },
  { id: 'same_day', title: 'Same-day reply', desc: 'Wrote back within a day of a letter landing.', icon: 'clock', reward: 'chamomile', done: (s) => s.same_day },
  { id: 'pen_pal', title: 'Pen pal', desc: 'Wrote to one friend four weeks running.', icon: 'calendar', reward: 'forgetmenot', progress: (s) => [Math.min(4, s.pen_pal_weeks), 4], done: (s) => s.pen_pal_weeks >= 4 },
  { id: 'full_shelf', title: 'Full shelf', desc: 'Five friends on the shelf.', icon: 'shelf', reward: 'lace', progress: (s) => [Math.min(5, s.friends), 5], done: (s) => s.friends >= 5 },
  { id: 'seasons', title: 'Every season', desc: 'Letters in all four seasons.', icon: 'leaf', reward: 'marigold', progress: (s) => [Math.min(4, s.seasons), 4], done: (s) => s.seasons >= 4 },
  { id: 'one_year', title: 'One year', desc: 'A year of letters with one friend.', icon: 'ring', reward: 'bow', done: (s) => s.one_year }
];

/** Mix-ins anyone can use; the rest are earned. */
export const FREE_MIXINS = ['gold', 'glitter', 'twigs', 'petals', 'ribbon', 'lavender'];
export const earnedBy = (mixin: string) => ACHIEVEMENTS.find((a) => a.reward === mixin);
export const unlocked = (mixin: string, s: SealStats | null) => {
  if (FREE_MIXINS.includes(mixin)) return true;
  const a = earnedBy(mixin);
  return !!a && !!s && a.done(s);
};

const SEASON = (m: number) => (m === 11 || m <= 1 ? 1 : m <= 4 ? 2 : m <= 7 ? 3 : 4);
const weekKey = (d: Date) => { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return Math.round(t.getTime() / (7 * 864e5)); };

/** Your own stats, from the letters already on this phone. */
export function localStats(uid: string, letters: Letter[], friends: Friend[]): SealStats {
  const sent = letters.filter((l) => l.sender === uid);
  const got = letters.filter((l) => l.recipient === uid);
  let best = 0;
  const byFriend = new Map<string, Set<number>>();
  sent.forEach((l) => { const s = byFriend.get(l.recipient) ?? new Set<number>(); s.add(weekKey(new Date(l.sent_at))); byFriend.set(l.recipient, s); });
  byFriend.forEach((weeks) => {
    const w = [...weeks].sort((a, b) => a - b); let run = 0;
    w.forEach((k, i) => { run = i && k === w[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
  });
  const yearAgo = Date.now() - 365 * 864e5;
  return {
    sealed: sent.length,
    night_owl: sent.some((l) => new Date(l.sent_at).getHours() < 4),
    long_haul: sent.some((l) => (l.distance_km ?? 0) >= 1000),
    enchanted: sent.some((l) => l.enchanted || !!l.audio_path),
    same_day: sent.some((b) => got.some((a) => a.sender === b.recipient
      && new Date(b.sent_at).getTime() >= new Date(a.arrive_at).getTime()
      && new Date(b.sent_at).getTime() <= new Date(a.arrive_at).getTime() + 864e5)),
    pen_pal_weeks: best,
    friends: friends.length,
    seasons: new Set(sent.map((l) => SEASON(new Date(l.sent_at).getMonth()))).size,
    one_year: friends.some((f) => new Date(f.mine.since).getTime() <= yearAgo && sent.some((l) => l.recipient === f.profile.id))
  };
}

const cache = new Map<string, SealStats | null>();

/** Stats for you or a friend. Falls back to your own letters when the server can't answer; friends then show nothing. */
export function useSealStats(target: string | undefined, fallback?: SealStats): SealStats | null {
  const [s, setS] = useState<SealStats | null>(target ? cache.get(target) ?? fallback ?? null : null);
  useEffect(() => {
    if (!target) return;
    let live = true;
    void supabase.rpc('seal_stats', { target }).then(({ data, error }) => {
      if (!live) return;
      const v = !error && data ? (data as SealStats) : null;
      if (v) cache.set(target, v);
      setS(v ?? fallback ?? null);
    });
    return () => { live = false; };
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps
  return s ?? fallback ?? null;
}
