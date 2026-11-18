import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Friend, Letter } from './types';
import { FREE_PIECES } from './owl';

/** What the achievements are worked out from. The server keeps these for you and your friends (seal_stats);
 *  if it can't answer, your own are worked out here from your letters. */
export interface SealStats {
  sealed: number;
  night_owl_nights: number;     // different nights a letter was sealed between midnight and 4 am
  km?: number;                  // total distance flown by your letters
  enchanted: boolean;
  same_day_count: number;       // letters written within a day of that friend's letter landing
  pen_pal_weeks: number;        // longest run of weeks where you and one friend both wrote to each other
  friends: number;
  pen_friends: number;          // friends you've swapped letters with both ways
  seasons: number;
  year_months: number;          // longest run of months writing to one friend at least once a month
  cities?: number;              // different places your letters have flown to
  longest_km?: number;          // the longest single flight
  sea_count: number;            // flights over open sea
  far_count: number;            // flights longer than FAR_KM
  seal_since?: string | null;   // when the seal was first made (for the Heirloom patina)
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

export const LONG_HAUL_KM = 20000;
export const FAR_KM = 5000;
const count = (n: number, get: (s: SealStats) => number) => ({ progress: (s: SealStats) => [Math.min(n, get(s) ?? 0), n] as [number, number], done: (s: SealStats) => (get(s) ?? 0) >= n });

export const SEAL_ACHIEVEMENTS: Achievement[] = [
  { kind: 'seal', id: 'first', title: 'First letter', desc: 'Sealed and sent a first letter.', done: (s) => s.sealed >= 1 },
  { kind: 'seal', id: 'night_owl', title: 'Night owl', desc: 'Sealed letters after midnight on three different nights.', reward: 'feather', ...count(3, (s) => s.night_owl_nights) },
  { kind: 'seal', id: 'long_haul', title: 'Long haul', desc: 'Letters flew 20,000 km in all.', reward: 'cornflower', unit: ' km', ...count(LONG_HAUL_KM, (s) => Math.round(s.km ?? 0)) },
  { kind: 'seal', id: 'enchanted', title: 'Enchanted', desc: 'Sent a letter in your own voice.', reward: 'babysbreath', done: (s) => s.enchanted },
  { kind: 'seal', id: 'same_day', title: 'Same-day reply', desc: 'Wrote back within a day of a letter landing, three times.', reward: 'chamomile', ...count(3, (s) => s.same_day_count) },
  { kind: 'seal', id: 'pen_pal', title: 'Pen pal', desc: 'You and one friend wrote to each other four weeks running. You both earn it together.', reward: 'forgetmenot', ...count(4, (s) => s.pen_pal_weeks) },
  { kind: 'seal', id: 'full_shelf', title: 'Full shelf', desc: 'Swapped letters both ways with five friends.', reward: 'lace', ...count(5, (s) => s.pen_friends) },
  { kind: 'seal', id: 'seasons', title: 'Every season', desc: 'Letters in all four seasons.', reward: 'marigold', ...count(4, (s) => s.seasons) },
  { kind: 'seal', id: 'one_year', title: 'One year', desc: 'Wrote to one friend every month for a year.', reward: 'bow', unit: ' months', ...count(12, (s) => s.year_months) }
];
const carried = (n: number, reward: string, id: string, title: string): Achievement =>
  ({ kind: 'owl', id, title, desc: `Carried ${n} letters.`, reward, ...count(n, (s) => s.sealed) });
const flown = (km: number, reward: string, id: string, title: string): Achievement =>
  ({ kind: 'owl', id, title, desc: `Flew ${km.toLocaleString('en-GB')} km in all.`, reward, unit: ' km', ...count(km, (s) => Math.round(s.km ?? 0)) });

/** Owl achievements: each one unlocks something for your owl to wear. */
export const OWL_ACHIEVEMENTS: Achievement[] = [
  carried(15, 'postman_cap', 'busy_beak', 'Busy beak'),
  carried(40, 'mailbag', 'full_bag', 'Full bag'),
  carried(80, 'rain_cloak', 'rain_shine', 'Rain or shine'),
  carried(150, 'cloak', 'old_hand', 'Old hand'),
  flown(2500, 'goggles', 'first_1000', 'First stretch'),
  flown(25000, 'flight_cap', 'cross_country', 'Cross-country'),
  flown(50000, 'silk_scarf', 'jet_stream', 'Jet stream'),
  flown(80000, 'wayfarer_cloak', 'wayfarer', 'Wayfarer'),
  flown(120000, 'compass_chain', 'true_north', 'True north'),
  { kind: 'owl', id: 'explorer', title: 'Explorer', desc: 'Letters to friends in 5 different cities.', reward: 'rucksack', ...count(5, (s) => s.cities ?? 0) },
  { kind: 'owl', id: 'sea', title: 'Sea crossing', desc: 'Three flights over open sea.', reward: 'souwester', ...count(3, (s) => s.sea_count) },
  { kind: 'owl', id: 'far_flight', title: 'Far flight', desc: 'Three flights longer than 5,000 km.', reward: 'fur_hood', ...count(3, (s) => s.far_count) }
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
/** Monday-start week, in UTC so both friends count the same weeks. */
const weekKey = (iso: string) => { const t = new Date(iso); t.setUTCHours(0, 0, 0, 0); t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7)); return Math.round(t.getTime() / (7 * 864e5)); };
const monthKey = (iso: string) => { const d = new Date(iso); return d.getFullYear() * 12 + d.getMonth(); };
const dayKey = (iso: string) => new Date(iso).toDateString();
/** Longest run of consecutive keys in a set of numbers. */
const longestRun = (keys: Set<number>) => {
  const k = [...keys].sort((a, b) => a - b); let run = 0, best = 0;
  k.forEach((x, i) => { run = i && x === k[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); });
  return best;
};

/** Your own stats, from the letters already on this phone. */
export function localStats(uid: string, letters: Letter[], friends: Friend[], sealSince?: string | null): SealStats {
  const sent = letters.filter((l) => l.sender === uid);
  const got = letters.filter((l) => l.recipient === uid);
  const friendIds = new Set(friends.map((f) => f.profile.id));
  const group = <T,>(xs: Letter[], key: (l: Letter) => string, val: (l: Letter) => T) => {
    const m = new Map<string, Set<T>>();
    xs.forEach((l) => { const s = m.get(key(l)) ?? new Set<T>(); s.add(val(l)); m.set(key(l), s); });
    return m;
  };
  const sentWeeks = group(sent, (l) => l.recipient, (l) => weekKey(l.sent_at));
  const gotWeeks = group(got, (l) => l.sender, (l) => weekKey(l.sent_at));
  let penPal = 0;
  sentWeeks.forEach((weeks, f) => {
    const theirs = gotWeeks.get(f);
    if (theirs) penPal = Math.max(penPal, longestRun(new Set([...weeks].filter((w) => theirs.has(w)))));
  });
  let yearMonths = 0;
  group(sent, (l) => l.recipient, (l) => monthKey(l.sent_at)).forEach((m) => { yearMonths = Math.max(yearMonths, longestRun(m)); });
  const km = sent.reduce((t, l) => t + (l.distance_km ?? 0), 0);
  return {
    sealed: sent.length,
    night_owl_nights: new Set(sent.filter((l) => new Date(l.sent_at).getHours() < 4).map((l) => dayKey(l.sent_at))).size,
    km,
    enchanted: sent.some((l) => l.enchanted || !!l.audio_path),
    same_day_count: sent.filter((b) => got.some((a) => a.sender === b.recipient
      && new Date(b.sent_at).getTime() >= new Date(a.arrive_at).getTime()
      && new Date(b.sent_at).getTime() <= new Date(a.arrive_at).getTime() + 864e5)).length,
    pen_pal_weeks: penPal,
    friends: friends.length,
    pen_friends: [...sentWeeks.keys()].filter((f) => friendIds.has(f) && gotWeeks.has(f)).length,
    seasons: new Set(sent.map((l) => SEASON(new Date(l.sent_at).getMonth()))).size,
    year_months: yearMonths,
    cities: new Set(sent.map((l) => l.to_place?.toLowerCase()).filter(Boolean)).size,
    longest_km: sent.reduce((m, l) => Math.max(m, l.distance_km ?? 0), 0),
    sea_count: sent.filter((l) => l.over_sea).length,
    far_count: sent.filter((l) => (l.distance_km ?? 0) > FAR_KM).length,
    seal_since: sealSince ?? null
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

/** A stamp in someone's logbook: when it was earned and whether its owner has watched it get stamped. */
export interface StampRow { achievement: string; earned_at: string; seen_at: string | null }

const rowCache = new Map<string, StampRow[]>();
/** Logbook stamps for you or a friend (filed by the server as achievements are earned). */
export function useStampRows(target: string | undefined): [StampRow[], () => void] {
  const [rows, setRows] = useState<StampRow[]>(target ? rowCache.get(target) ?? [] : []);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!target) return;
    let live = true;
    void supabase.from('stamps').select('achievement, earned_at, seen_at').eq('user_id', target).then(({ data, error }) => {
      if (!live || error || !data) return;
      rowCache.set(target, data as StampRow[]);
      setRows(data as StampRow[]);
    });
    return () => { live = false; };
  }, [target, n]);
  return [rows, () => setN((x) => x + 1)];
}

// How many of your stamps are still waiting to be stamped, for the Profile tab dot and the in-app banner.
let unseen = 0;
const unseenSubs = new Set<(n: number) => void>();
export async function refreshUnseen(uid: string) {
  const { count, error } = await supabase.from('stamps').select('achievement', { count: 'exact', head: true }).eq('user_id', uid).is('seen_at', null);
  if (error) return;
  unseen = count ?? 0;
  unseenSubs.forEach((f) => f(unseen));
}
export function useUnseenStamps(uid: string | undefined) {
  const [n, setN] = useState(unseen);
  useEffect(() => {
    unseenSubs.add(setN);
    return () => { unseenSubs.delete(setN); };
  }, []);
  useEffect(() => {
    if (!uid) return;
    void refreshUnseen(uid);
    const on = () => { if (!document.hidden) void refreshUnseen(uid); };
    document.addEventListener('visibilitychange', on);
    const t = window.setInterval(on, 120000);
    return () => { document.removeEventListener('visibilitychange', on); window.clearInterval(t); };
  }, [uid]);
  return n;
}
/** You've watched these get stamped. */
export async function markStampsSeen(uid: string, ids: string[]) {
  if (!ids.length) return;
  await supabase.rpc('stamps_seen', { ids });
  const c = rowCache.get(uid);
  if (c) rowCache.set(uid, c.map((r) => (ids.includes(r.achievement) ? { ...r, seen_at: new Date().toISOString() } : r)));
  await refreshUnseen(uid);
}
