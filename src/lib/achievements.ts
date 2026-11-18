import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Friend, Letter } from './types';
import { FREE_PIECES } from './owl';

/** What the achievements are worked out from. The server keeps these for you and your friends (seal_stats);
 *  if it can't answer, your own are worked out here from your letters. */
export interface SealStats {
  sealed: number;
  night_owl: boolean;
  long_haul: boolean;
  km?: number;                  // total distance flown by your letters
  enchanted: boolean;
  same_day: boolean;
  pen_pal_weeks: number;
  friends: number;
  seasons: number;
  one_year: boolean;
  cities?: number;              // different places your letters have flown to
  longest_km?: number;          // the longest single flight
  sea?: boolean;                // a letter that flew over open sea
}

export interface Achievement {
  id: string;
  kind: 'seal' | 'owl';         // seal ones unlock mix-ins, owl ones unlock something for your owl to wear
  title: string;
  desc: string;
  reward?: string;              // the mix-in or piece it unlocks
  unit?: string;                // for the progress numbers
  progress?: (s: SealStats) => [number, number];
  done: (s: SealStats) => boolean;
}

export const LONG_HAUL_KM = 5000;

export const SEAL_ACHIEVEMENTS: Achievement[] = [
  { kind: 'seal', id: 'first', title: 'First letter', desc: 'Sealed and sent a first letter.', done: (s) => s.sealed >= 1 },
  { kind: 'seal', id: 'night_owl', title: 'Night owl', desc: 'Sealed a letter after midnight.', reward: 'feather', done: (s) => s.night_owl },
  { kind: 'seal', id: 'long_haul', title: 'Long haul', desc: 'Letters flew 5,000 km in all.', reward: 'cornflower', progress: (s) => [Math.min(LONG_HAUL_KM, Math.round(s.km ?? 0)), LONG_HAUL_KM], unit: ' km', done: (s) => (s.km ?? 0) >= LONG_HAUL_KM },
  { kind: 'seal', id: 'enchanted', title: 'Enchanted', desc: 'Sent a letter in your own voice.', reward: 'babysbreath', done: (s) => s.enchanted },
  { kind: 'seal', id: 'same_day', title: 'Same-day reply', desc: 'Wrote back within a day of a letter landing.', reward: 'chamomile', done: (s) => s.same_day },
  { kind: 'seal', id: 'pen_pal', title: 'Pen pal', desc: 'Wrote to one friend four weeks running.', reward: 'forgetmenot', progress: (s) => [Math.min(4, s.pen_pal_weeks), 4], done: (s) => s.pen_pal_weeks >= 4 },
  { kind: 'seal', id: 'full_shelf', title: 'Full shelf', desc: 'Five friends on the shelf.', reward: 'lace', progress: (s) => [Math.min(5, s.friends), 5], done: (s) => s.friends >= 5 },
  { kind: 'seal', id: 'seasons', title: 'Every season', desc: 'Letters in all four seasons.', reward: 'marigold', progress: (s) => [Math.min(4, s.seasons), 4], done: (s) => s.seasons >= 4 },
  { kind: 'seal', id: 'one_year', title: 'One year', desc: 'A year of letters with one friend.', reward: 'bow', done: (s) => s.one_year }
];
const carried = (n: number, reward: string, id: string, title: string): Achievement =>
  ({ kind: 'owl', id, title, desc: `Carried ${n} letters.`, reward, progress: (s) => [Math.min(n, s.sealed), n], done: (s) => s.sealed >= n });
const flown = (km: number, reward: string, id: string, title: string): Achievement =>
  ({ kind: 'owl', id, title, desc: `Flew ${km.toLocaleString('en-GB')} km in all.`, reward, unit: ' km', progress: (s) => [Math.min(km, Math.round(s.km ?? 0)), km], done: (s) => (s.km ?? 0) >= km });

/** Owl achievements: each one unlocks something for your owl to wear. */
export const OWL_ACHIEVEMENTS: Achievement[] = [
  carried(10, 'postman_cap', 'busy_beak', 'Busy beak'),
  carried(25, 'mailbag', 'full_bag', 'Full bag'),
  carried(50, 'rain_cloak', 'rain_shine', 'Rain or shine'),
  carried(100, 'cloak', 'old_hand', 'Old hand'),
  flown(1000, 'goggles', 'first_1000', 'First thousand'),
  flown(10000, 'flight_cap', 'cross_country', 'Cross-country'),
  flown(20000, 'silk_scarf', 'jet_stream', 'Jet stream'),
  flown(30000, 'wayfarer_cloak', 'wayfarer', 'Wayfarer'),
  flown(50000, 'compass_chain', 'true_north', 'True north'),
  { kind: 'owl', id: 'explorer', title: 'Explorer', desc: 'Letters to friends in 5 different cities.', reward: 'rucksack', progress: (s) => [Math.min(5, s.cities ?? 0), 5], done: (s) => (s.cities ?? 0) >= 5 },
  { kind: 'owl', id: 'sea', title: 'Sea crossing', desc: 'A letter that flew over open sea.', reward: 'souwester', done: (s) => !!s.sea },
  { kind: 'owl', id: 'far_flight', title: 'Far flight', desc: 'One flight longer than 1,500 km.', reward: 'fur_hood', done: (s) => (s.longest_km ?? 0) > 1500 }
];

export const ACHIEVEMENTS: Achievement[] = [...SEAL_ACHIEVEMENTS, ...OWL_ACHIEVEMENTS];


/** Mix-ins anyone can use; the rest are earned. */
export const FREE_MIXINS = ['gold', 'glitter', 'twigs', 'petals', 'ribbon', 'lavender'];
export const earnedBy = (mixin: string) => ACHIEVEMENTS.find((a) => a.reward === mixin);
export const unlocked = (mixin: string, s: SealStats | null) => {
  if (FREE_MIXINS.includes(mixin) || FREE_PIECES.includes(mixin)) return true;
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
    long_haul: sent.reduce((t, l) => t + (l.distance_km ?? 0), 0) >= LONG_HAUL_KM,
    km: sent.reduce((t, l) => t + (l.distance_km ?? 0), 0),
    enchanted: sent.some((l) => l.enchanted || !!l.audio_path),
    same_day: sent.some((b) => got.some((a) => a.sender === b.recipient
      && new Date(b.sent_at).getTime() >= new Date(a.arrive_at).getTime()
      && new Date(b.sent_at).getTime() <= new Date(a.arrive_at).getTime() + 864e5)),
    pen_pal_weeks: best,
    friends: friends.length,
    seasons: new Set(sent.map((l) => SEASON(new Date(l.sent_at).getMonth()))).size,
    one_year: friends.some((f) => new Date(f.mine.since).getTime() <= yearAgo && sent.some((l) => l.recipient === f.profile.id)),
    cities: new Set(sent.map((l) => l.to_place?.toLowerCase()).filter(Boolean)).size,
    longest_km: sent.reduce((m, l) => Math.max(m, l.distance_km ?? 0), 0),
    sea: sent.some((l) => l.over_sea)
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
