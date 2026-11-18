import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import type { Profile } from '../lib/types';
import { Owl, Top } from '../components/bits';
import { ACHIEVEMENTS, localStats, unlocked, useSealStats } from '../lib/achievements';
import { BREEDS, PIECES, PLUME_OF, RANKS, SLOTS, breedName, breedOf, breedUnlocked, cleanOutfit, pieceOf, rankOf, speedPct, type Breed, type Outfit, type Slot } from '../lib/owl';

const OWL_NAMES = ['Wren', 'Postscript', 'Detour', 'Quill', 'Inkwell', 'Vellum', 'Sepia', 'Moth', 'Dusk', 'Comet', 'Nimbus', 'Ember', 'Vesper',
  'Hazel', 'Juniper', 'Bramble', 'Clementine', 'Tara', 'Megh', 'Kesar', 'Chandu', 'Archibald', 'Bartholomew', 'Sir Reginald', 'The Professor', 'Courier', 'Wanderer', 'Pip', 'Biscuit', 'Mango'];
export const randomOwlName = (not?: string) => { let n = not; while (n === not) n = OWL_NAMES[Math.floor(Math.random() * OWL_NAMES.length)]; return n!; };

const LOCK = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
const DICE = <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="15" r="1.2" fill="currentColor" /><circle cx="15" cy="9" r="1.2" fill="currentColor" /><circle cx="9" cy="15" r="1.2" fill="currentColor" /></svg>;

export function OwlName({ value, set }: { value: string; set: (v: string) => void }) {
  return (
    <div className="owl-name">
      <input id="owlName" type="text" value={value} maxLength={20} placeholder="Your owl's name" aria-label="Your owl's name" onChange={(e) => set(e.target.value)} />
      <button type="button" className="owl-dice" onClick={() => set(randomOwlName(value))} aria-label="Suggest a name">{DICE}</button>
    </div>
  );
}

/** The breeds, side by side. Locked ones say which rank opens them. */
export function BreedPicker({ breed, km, set }: { breed: Breed; km: number; set: (b: Breed) => void }) {
  const row = useRef<HTMLDivElement>(null);
  // start with the chosen breed in view
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('.breed.on');
    if (el && row.current) row.current.scrollLeft = Math.max(0, el.offsetLeft - row.current.clientWidth / 2 + el.clientWidth / 2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="breed-row hscroll" ref={row}>
      {BREEDS.map((b) => {
        const open = breedUnlocked(b.id, km);
        const on = b.id === breed;
        const need = RANKS.find((r) => r.id === b.rank);
        return (
          <button key={b.id} className={`breed${on ? ' on' : ''}${open ? '' : ' locked'}`} aria-pressed={on} disabled={!open}
            aria-label={open ? b.full : `${b.full}, opens at ${need?.name}`} onClick={() => set(b.id)}>
            <span className="breed-pic"><img src={`/owls/base-${b.id}.webp`} alt="" /></span>
            <span className="breed-name">{b.name}</span>
            {!open && <span className="breed-lock">{LOCK}{need?.short}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** A wardrobe tile: the piece on your owl, cropped to where it's worn. */
function PieceThumb({ breed, slot, id, dim }: { breed: Breed; slot: Slot; id?: string; dim?: boolean }) {
  if (!id) return <span className="piece-pic none" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></span>;
  const top = slot === 'head' || slot === 'eyes';
  return (
    <span className={`piece-pic${top ? ' top' : ''}${dim ? ' dim' : ''}`} aria-hidden="true">
      <Owl p={{ breed }} outfit={{ [slot]: id }} />
    </span>
  );
}

export default function Dress() {
  const { me, saveMe, session, letters, friends, say } = useStore();
  const uid = session?.user.id;
  const stats = useSealStats(uid, uid ? localStats(uid, letters, friends) : undefined);
  const [breed, setBreed] = useState<Breed>(breedOf(me?.breed));
  const [outfit, setOutfit] = useState<Outfit>(cleanOutfit(me?.outfit));
  const [name, setName] = useState(me?.owl_name ?? '');
  const [slot, setSlot] = useState<Slot>('head');
  // anything not earned (yet) comes off
  useEffect(() => {
    if (!stats) return;
    const kept = Object.fromEntries(Object.entries(outfit).filter(([, id]) => id && unlocked(id, stats))) as Outfit;
    if (Object.keys(kept).length !== Object.values(outfit).filter(Boolean).length) setOutfit(kept);
  }, [stats]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!me) return null;
  const km = Math.max(me.flown_km ?? 0, stats?.km ?? 0);
  const rank = rankOf(km);
  const draft: Partial<Profile> = { breed, outfit: outfit as Record<string, string>, flown_km: km };
  const worn = SLOTS.map((s) => ({ s, p: pieceOf(outfit[s.id]) })).filter((x) => x.p);
  const pieces = PIECES.filter((p) => p.slot === slot);

  async function save() {
    // only pieces that are earned can be worn
    const kept = Object.fromEntries(Object.entries(outfit).filter(([, id]) => id && unlocked(id, stats))) as Record<string, string>;
    await saveMe({ breed, plume: PLUME_OF[breed], outfit: kept, owl_name: name.trim() || me!.owl_name || 'Wren' });
    say(`${name.trim() || 'Your owl'} is dressed.`);
    go('profile');
  }

  return (
    <main className="app">
      <Top title={`Dress ${name.trim() || 'your owl'}`} back="profile" />
      <section className="card dress-hero">
        <Owl p={draft} perch outfit={outfit} width={144} alt={`${name || 'Your owl'}, a felt ${breedName(breed).toLowerCase()}${worn.length ? ` wearing ${worn.map((w) => w.p!.name.toLowerCase()).join(', ')}` : ''}, on ${rank.perch}`} />
        <div className="stack" style={{ gap: 8, minWidth: 0, flex: 1 }}>
          <OwlName value={name} set={setName} />
          <span className="small muted">{breedName(breed)} · {rank.name}</span>
          {rank.speed > 1 && <span className="speed-tag">{speedPct(rank.speed)} faster</span>}
          <ul className="worn small muted">
            {worn.map((w) => <li key={w.s.id}>{w.s.name} · {w.p!.name}</li>)}
            <li>Perch · {rank.perch.replace(/^an? /, '').replace(/^./, (c) => c.toUpperCase())}, from rank</li>
          </ul>
        </div>
      </section>

      <section className="stack" style={{ gap: 6 }}>
        <h2>Breed</h2>
        <BreedPicker breed={breed} km={km} set={setBreed} />
      </section>

      <section className="stack" style={{ gap: 10 }}>
        <div className="seg five" role="tablist" aria-label="Wardrobe">
          {SLOTS.map((s) => <button key={s.id} role="tab" aria-selected={slot === s.id} className={slot === s.id ? 'on' : ''} onClick={() => setSlot(s.id)}>{s.name}</button>)}
        </div>
        <div className="piece-grid">
          <button className={`piece${!outfit[slot] ? ' on' : ''}`} aria-pressed={!outfit[slot]} onClick={() => setOutfit({ ...outfit, [slot]: undefined })}>
            <PieceThumb breed={breed} slot={slot} />
            <span className="piece-name">None</span>
          </button>
          {pieces.map((p) => {
            const open = unlocked(p.id, stats);
            const on = outfit[slot] === p.id;
            const by = ACHIEVEMENTS.find((a) => a.reward === p.id);
            return (
              <button key={p.id} className={`piece${on ? ' on' : ''}${open ? '' : ' locked'}`} aria-pressed={on}
                aria-label={open ? p.name : `${p.name}, earned with ${by?.title}`}
                onClick={() => (open ? setOutfit({ ...outfit, [slot]: on ? undefined : p.id }) : say(`${p.name} is earned with ${by?.title}: ${by?.desc.replace(/\.$/, '').toLowerCase()}.`))}>
                <PieceThumb breed={breed} slot={slot} id={p.id} dim={!open} />
                <span className="piece-name">{p.name}</span>
                {on && <span className="piece-note worn-note">Worn</span>}
                {!open && <span className="piece-note">{LOCK}{by?.title}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <div className="foot">
        <button className="btn" onClick={() => go('profile')}>Cancel</button>
        <button className="btn wax" onClick={() => void save()}>Save</button>
      </div>
    </main>
  );
}
