// The achievement rules, for the server. Keep in step with src/lib/achievements.ts (thresholds and ids),
// src/components/bits.tsx (PATINA) and src/lib/owl.ts (RANKS).

export interface Stats {
  sealed: number; night_owl_nights: number; km?: number; enchanted: boolean; same_day_count: number;
  pen_pal_weeks: number; friends: number; pen_friends: number; seasons: number; year_months: number;
  cities?: number; longest_km?: number; sea_count: number; far_count: number; seal_since?: string | null;
}

export interface Rule {
  id: string;
  kind: 'seal' | 'owl';
  title: string;
  /** What it's for, to finish "A new stamp: Night owl, …" in the notification. {owl} is the owl's name. */
  why: string;
  done: (s: Stats) => boolean;
}

const km = (s: Stats) => Math.round(s.km ?? 0);

export const RULES: Rule[] = [
  { id: 'first', kind: 'seal', title: 'First letter', why: 'your very first letter', done: (s) => s.sealed >= 1 },
  { id: 'night_owl', kind: 'seal', title: 'Night owl', why: 'letters sealed after midnight on three nights', done: (s) => s.night_owl_nights >= 3 },
  { id: 'long_haul', kind: 'seal', title: 'Long haul', why: 'your letters have flown 20,000 km', done: (s) => km(s) >= 20000 },
  { id: 'enchanted', kind: 'seal', title: 'Enchanted', why: 'a letter sent in your own voice', done: (s) => !!s.enchanted },
  { id: 'same_day', kind: 'seal', title: 'Same-day reply', why: 'three replies written the day a letter landed', done: (s) => s.same_day_count >= 3 },
  { id: 'pen_pal', kind: 'seal', title: 'Pen pal', why: 'four weeks running of letters both ways with a friend', done: (s) => s.pen_pal_weeks >= 4 },
  { id: 'full_shelf', kind: 'seal', title: 'Full shelf', why: 'letters swapped both ways with five friends', done: (s) => s.pen_friends >= 5 },
  { id: 'seasons', kind: 'seal', title: 'Every season', why: 'letters in all four seasons', done: (s) => s.seasons >= 4 },
  { id: 'one_year', kind: 'seal', title: 'One year', why: 'a letter to one friend every month for a year', done: (s) => s.year_months >= 12 },
  { id: 'busy_beak', kind: 'owl', title: 'Busy beak', why: '{owl} has carried 15 letters', done: (s) => s.sealed >= 15 },
  { id: 'full_bag', kind: 'owl', title: 'Full bag', why: '{owl} has carried 40 letters', done: (s) => s.sealed >= 40 },
  { id: 'rain_shine', kind: 'owl', title: 'Rain or shine', why: '{owl} has carried 80 letters', done: (s) => s.sealed >= 80 },
  { id: 'old_hand', kind: 'owl', title: 'Old hand', why: '{owl} has carried 150 letters', done: (s) => s.sealed >= 150 },
  { id: 'first_1000', kind: 'owl', title: 'First stretch', why: '{owl} has flown 2,500 km', done: (s) => km(s) >= 2500 },
  { id: 'cross_country', kind: 'owl', title: 'Cross-country', why: '{owl} has flown 25,000 km', done: (s) => km(s) >= 25000 },
  { id: 'jet_stream', kind: 'owl', title: 'Jet stream', why: '{owl} has flown 50,000 km', done: (s) => km(s) >= 50000 },
  { id: 'wayfarer', kind: 'owl', title: 'Wayfarer', why: '{owl} has flown 80,000 km', done: (s) => km(s) >= 80000 },
  { id: 'true_north', kind: 'owl', title: 'True north', why: '{owl} has flown 120,000 km', done: (s) => km(s) >= 120000 },
  { id: 'explorer', kind: 'owl', title: 'Explorer', why: 'letters to friends in five different cities', done: (s) => (s.cities ?? 0) >= 5 },
  { id: 'sea', kind: 'owl', title: 'Sea crossing', why: 'three flights over open sea', done: (s) => s.sea_count >= 3 },
  { id: 'far_flight', kind: 'owl', title: 'Far flight', why: 'three flights longer than 5,000 km', done: (s) => s.far_count >= 3 },
];

export const PATINA = [
  { at: 0, name: 'Fresh', note: 'Crisp edges and a matte pour.' },
  { at: 15, name: 'Warmed', note: 'The wax has softened and picked up a gentle sheen.' },
  { at: 40, name: 'Gilded', note: 'The rim around your initials is touched with gold.' },
  { at: 80, name: 'Burnished', note: 'The raised wax has polished smooth, like it has been handled often.' },
  { at: 150, name: 'Heirloom', note: 'The wax has deepened and caught a few flecks of gold leaf.' },
];
export function patinaStage(sealed: number, since?: string | null) {
  let s = 0; PATINA.forEach((p, i) => { if (sealed >= p.at) s = i; });
  const age = since ? (Date.now() - new Date(since).getTime()) / 864e5 : 0;
  return s === PATINA.length - 1 && age < 365 ? s - 1 : s;
}

export const RANKS = [
  { at: 0, name: 'New courier', perch: 'a twig perch', speed: 0 },
  { at: 10000, name: 'Courier', perch: 'a wooden perch', speed: 10 },
  { at: 25000, name: 'Senior courier', perch: 'a silver-capped perch', speed: 20 },
  { at: 40000, name: 'Veteran', perch: 'a gold-capped perch', speed: 30 },
  { at: 75000, name: 'Master courier', perch: 'a solid gold perch', speed: 40 },
];
export const rankIndex = (km: number) => { let r = 0; RANKS.forEach((x, i) => { if (km >= x.at) r = i; }); return r; };
