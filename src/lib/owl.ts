import manifest from './owl-manifest.json';
import type { Plume } from './types';

/** The eight felt owls. Three unlock as your owl ranks up. */
export type Breed = 'classic' | 'tawny' | 'barn' | 'spotted' | 'burrowing' | 'scops' | 'snowy' | 'eagle';
export const BREEDS: { id: Breed; name: string; full: string; rank?: RankKey }[] = [
  { id: 'classic', name: 'Classic', full: 'Classic owl' },
  { id: 'tawny', name: 'Tawny', full: 'Tawny owl' },
  { id: 'barn', name: 'Barn', full: 'Barn owl' },
  { id: 'spotted', name: 'Spotted', full: 'Spotted owlet' },
  { id: 'burrowing', name: 'Burrowing', full: 'Burrowing owl' },
  { id: 'scops', name: 'Scops', full: 'Indian scops owl', rank: 'senior' },
  { id: 'snowy', name: 'Snowy', full: 'Snowy owl', rank: 'veteran' },
  { id: 'eagle', name: 'Eagle owl', full: 'Eurasian eagle owl', rank: 'master' }
];
export const breedOf = (b?: string | null): Breed => (BREEDS.some((x) => x.id === b) ? (b as Breed) : 'tawny');
export const breedName = (b?: string | null) => BREEDS.find((x) => x.id === breedOf(b))!.full;

/** The map still draws its owl, and the owl-feather mix-in is tinted, in a plumage colour. */
export const PLUME_OF: Record<Breed, Plume> = {
  classic: 'russet', tawny: 'tawny', barn: 'sand', spotted: 'umber', burrowing: 'sand', scops: 'ash', snowy: 'white', eagle: 'russet'
};

/** Rank: distance flown in all. It shows as the perch your owl stands on, and makes letters land sooner. */
export type RankKey = 'new' | 'courier' | 'senior' | 'veteran' | 'master';
export const RANKS: { id: RankKey; name: string; short: string; at: number; speed: number; perch: string; note: string }[] = [
  { id: 'new', name: 'New courier', short: 'New', at: 0, speed: 1.0, perch: 'a twig perch', note: 'A plain twig with one leaf.' },
  { id: 'courier', name: 'Courier', short: 'Courier', at: 1000, speed: 1.1, perch: 'a wooden perch', note: 'A plain wooden perch.' },
  { id: 'senior', name: 'Senior courier', short: 'Senior', at: 5000, speed: 1.2, perch: 'a silver-capped perch', note: 'Silver end caps.' },
  { id: 'veteran', name: 'Veteran', short: 'Veteran', at: 15000, speed: 1.3, perch: 'a gold-capped perch', note: 'Gold end caps.' },
  { id: 'master', name: 'Master courier', short: 'Master', at: 25000, speed: 1.4, perch: 'a solid gold perch', note: 'Solid gold.' }
];
export const rankIndex = (km?: number | null) => { let r = 0; RANKS.forEach((x, i) => { if ((km ?? 0) >= x.at) r = i; }); return r; };
export const rankOf = (km?: number | null) => RANKS[rankIndex(km)];
export const breedUnlocked = (b: Breed, km?: number | null) => {
  const need = BREEDS.find((x) => x.id === b)?.rank;
  return !need || rankIndex(km) >= RANKS.findIndex((r) => r.id === need);
};

/** One piece per slot. */
export type Slot = 'head' | 'eyes' | 'neck' | 'bag' | 'body';
export const SLOTS: { id: Slot; name: string }[] = [
  { id: 'head', name: 'Head' }, { id: 'eyes', name: 'Eyes' }, { id: 'neck', name: 'Neck' }, { id: 'bag', name: 'Bag' }, { id: 'body', name: 'Cloak' }
];
export type Outfit = Partial<Record<Slot, string>>;

export interface Piece { id: string; slot: Slot; name: string; note: string; hat?: boolean }
export const PIECES: Piece[] = [
  { id: 'postman_cap', slot: 'head', name: 'Postman’s cap', note: 'Navy felt with a brass horn badge.', hat: true },
  { id: 'flight_cap', slot: 'head', name: 'Leather flight cap', note: 'Fleece-lined, with ear flaps.', hat: true },
  { id: 'souwester', slot: 'head', name: 'Oilskin sou’wester', note: 'Yellow, with a wide brim for the rain.', hat: true },
  { id: 'fur_hood', slot: 'head', name: 'Fur-lined hood', note: 'Navy felt with a sheepskin trim.', hat: true },
  { id: 'sun_hat', slot: 'head', name: 'Straw sun hat', note: 'Woven straw with a blue bow.', hat: true },
  { id: 'bucket_hat', slot: 'head', name: 'Canvas bucket hat', note: 'Soft green canvas.', hat: true },
  { id: 'goggles', slot: 'eyes', name: 'Aviator goggles', note: 'Brass rims on a leather strap.' },
  { id: 'sunglasses', slot: 'eyes', name: 'Round sunglasses', note: 'Little round lenses on a cord.' },
  { id: 'knitted_scarf', slot: 'neck', name: 'Knitted scarf', note: 'Chunky and warm.' },
  { id: 'neckerchief', slot: 'neck', name: 'Gingham neckerchief', note: 'Blue and white, knotted at the front.' },
  { id: 'silk_scarf', slot: 'neck', name: 'White silk scarf', note: 'Knotted at the throat, like an old aviator.' },
  { id: 'compass_chain', slot: 'neck', name: 'Brass compass', note: 'On a chain of brass beads.' },
  { id: 'satchel', slot: 'bag', name: 'Leather satchel', note: 'Worn across the body.' },
  { id: 'straw_bag', slot: 'bag', name: 'Woven straw bag', note: 'A round summer bag.' },
  { id: 'mailbag', slot: 'bag', name: 'Mailbag', note: 'Stuffed with letters.' },
  { id: 'rucksack', slot: 'bag', name: 'Rucksack and bedroll', note: 'For the long way round.' },
  { id: 'summer_cloak', slot: 'body', name: 'Summer linen cloak', note: 'Light and breezy.' },
  { id: 'rain_cloak', slot: 'body', name: 'Rain cloak', note: 'Hooded, with toggles.' },
  { id: 'wayfarer_cloak', slot: 'body', name: 'Wayfarer cloak', note: 'For long journeys.' },
  { id: 'cloak', slot: 'body', name: 'Travelling cloak', note: 'Fastened with a wax seal.' }
];
export const pieceOf = (id?: string | null) => PIECES.find((p) => p.id === id);
/** Free from day one: the summer set, the satchel and the knitted scarf. The rest are earned (see achievements). */
export const FREE_PIECES = ['sun_hat', 'bucket_hat', 'sunglasses', 'neckerchief', 'straw_bag', 'summer_cloak', 'satchel', 'knitted_scarf'];

/** Only pieces that exist and sit in their own slot. */
export function cleanOutfit(o: unknown): Outfit {
  const out: Outfit = {};
  if (o && typeof o === 'object') {
    for (const [slot, id] of Object.entries(o as Record<string, unknown>)) {
      const p = pieceOf(typeof id === 'string' ? id : null);
      if (p && p.slot === slot) out[p.slot] = p.id;
    }
  }
  return out;
}

// ---- layers: what the app stacks to draw a dressed owl
type Layers = { front?: string | null; back?: string | null; base?: string | null; withCap?: string | null };
interface BreedManifest { layers: Record<string, Layers>; perch: { scale: number; ox: number; oy: Record<string, number> } }
const M = (manifest as { breeds: Record<string, BreedManifest> }).breeds;
const src = (n: string) => `/owls/${n}.webp`;
const ORDER: Slot[] = ['body', 'bag', 'neck', 'head', 'eyes'];

/** Image layers, back to front. */
export function owlLayers(breed: Breed, outfit: Outfit): string[] {
  const L = M[breed].layers;
  const ids = ORDER.map((s) => outfit[s]).filter((x): x is string => !!x && !!L[x]);
  const hat = ids.find((id) => pieceOf(id)?.hat);
  const out: string[] = [];
  if (ids.includes('rucksack') && L.rucksack.back) out.push(src(L.rucksack.back));
  if (hat && L[hat].back) out.push(src(L[hat].back!));
  out.push(src(hat && L[hat].base ? L[hat].base! : `base-${breed}`));
  for (const id of ids) {
    const l = L[id];
    const n = id === 'goggles' && outfit.head === 'flight_cap' ? l.withCap : l.front;
    if (n) out.push(src(n));
  }
  return out;
}

/** Where the owl stands on its perch, in a 480 × 600 frame. */
export function perchOf(breed: Breed, rank: RankKey) {
  const p = M[breed].perch;
  return { src: src(`perch-${rank}-${breed}`), scale: p.scale, x: p.ox / 480, y: (p.oy[rank] ?? p.oy.new) / 600 };
}
