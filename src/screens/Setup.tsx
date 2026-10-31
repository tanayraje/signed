import { useState } from 'react';
import { useStore } from '../lib/store';
import type { Eye, Plume, Profile, Wax } from '../lib/types';
import { MARKS, Owl, Seal, Top } from '../components/bits';
import { go } from '../lib/router';

export const WAX: [Wax, string, string][] = [['oxblood', 'Oxblood', '#96261F'], ['forest', 'Forest', '#2C5C4E'], ['ink', 'Ink blue', '#2C3A68'], ['mustard', 'Mustard', '#B48028'], ['plum', 'Plum', '#5C2C50'], ['soot', 'Soot', '#302A26']];
export const PLUME: [Plume, string, string][] = [['tawny', 'Tawny', '#9C7652'], ['ash', 'Ash', '#8A8880'], ['umber', 'Umber', '#684E3A'], ['sand', 'Sand', '#C4AA7E'], ['white', 'White', '#E4E0D6'], ['dark', 'Dark', '#3A3430'], ['russet', 'Russet', '#965636'], ['slate', 'Slate', '#606872']];
export const EYES: [Eye, string, string][] = [['amber', 'Amber', '#D6962E'], ['gold', 'Gold', '#E2BE46'], ['ember', 'Ember', '#D66822']];
const MIXINS: [string, string][] = [['gold', 'Gold flecks'], ['glitter', 'Glitter'], ['twigs', 'Twigs'], ['petals', 'Petals'], ['ribbon', 'Ribbon']];

const swatch = (hex: string) => ({ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.28), rgba(255,255,255,0) 55%), ${hex}` });

export function SealDesigner({ draft, set }: { draft: Profile; set: (p: Partial<Profile>) => void }) {
  return (
    <>
      <div className="row" style={{ justifyContent: 'center' }}><Seal p={draft} size={190} label="Your wax seal" /></div>
      <div className="stack">
        <label htmlFor="name"><h2>Your name</h2></label>
        <input id="name" type="text" value={draft.name} maxLength={30} autoComplete="given-name"
          onChange={(e) => set({ name: e.target.value })} placeholder="How friends know you" />
      </div>
      <section className="stack"><h2>Pressed into the centre</h2>
        <div className="chips">
          <button className={`chip${!draft.mark ? ' on' : ''}`} aria-pressed={!draft.mark} onClick={() => set({ mark: null })}>Letters</button>
          <button className={`chip${draft.mark ? ' on' : ''}`} aria-pressed={!!draft.mark} onClick={() => set({ mark: draft.mark || 'moon' })}>A mark</button>
        </div>
        {!draft.mark ? (
          <input id="mono" type="text" aria-label="Pressed letters" value={draft.monogram} maxLength={2} onChange={(e) => set({ monogram: e.target.value.toUpperCase() })} placeholder={draft.name.slice(0, 1).toUpperCase() || 'T'} />
        ) : (
          <div className="mark-pick">{Object.entries(MARKS).map(([k, [label, art]]) => (
            <button key={k} className={draft.mark === k ? 'on' : ''} aria-label={label} aria-pressed={draft.mark === k} onClick={() => set({ mark: k })}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{art}</svg>
            </button>
          ))}</div>
        )}
      </section>
      <section className="stack"><h2>Wax</h2>
        <div className="swatches">{WAX.map(([k, label, hex]) => (
          <button key={k} className={`sw${draft.wax === k ? ' on' : ''}`} style={swatch(hex)} aria-label={label} aria-pressed={draft.wax === k} onClick={() => set({ wax: k })} />
        ))}</div>
      </section>
      <section className="stack"><h2>Edge</h2>
        <div className="chips">{([['uneven', 'Poured'], ['clean', 'Pressed clean']] as const).map(([k, label]) => (
          <button key={k} className={`chip${(draft.edge ?? 'uneven') === k ? ' on' : ''}`} aria-pressed={(draft.edge ?? 'uneven') === k} onClick={() => set({ edge: k })}>{label}</button>
        ))}</div>
      </section>
      <section className="stack"><h2>Pressed into the wax</h2>
        <div className="chips">{MIXINS.map(([k, label]) => {
          const on = draft.mixins.includes(k);
          return <button key={k} className={`chip${on ? ' on' : ''}`} aria-pressed={on}
            onClick={() => set({ mixins: on ? draft.mixins.filter((m) => m !== k) : [...draft.mixins, k] })}>{label}</button>;
        })}</div>
      </section>
    </>
  );
}

export function OwlEditor({ draft, set }: { draft: Profile; set: (p: Partial<Profile>) => void }) {
  return (
    <>
      <div className="stone row" style={{ justifyContent: 'center', gap: 20, padding: '18px 16px 14px', alignItems: 'flex-end' }}>
        <Owl p={draft} width={120} alt="Your owl" />
        <div className="stack" style={{ paddingBottom: 14, width: 150 }}>
          <label htmlFor="owlName" className="small muted" style={{ fontStyle: 'italic' }}>Name</label>
          <input id="owlName" type="text" value={draft.owl_name} maxLength={20} onChange={(e) => set({ owl_name: e.target.value })} />
        </div>
      </div>
      <section className="stack"><h2>Plumage</h2>
        <div className="swatches">{PLUME.map(([k, label, hex]) => (
          <button key={k} className={`sw${draft.plume === k ? ' on' : ''}`} style={{ background: hex }} aria-label={`${label} plumage`} aria-pressed={draft.plume === k} onClick={() => set({ plume: k })} />
        ))}</div>
      </section>
      <section className="stack"><h2>Eyes</h2>
        <div className="swatches">{EYES.map(([k, label, hex]) => (
          <button key={k} className={`sw${draft.eye === k ? ' on' : ''}`} style={{ background: hex }} aria-label={`${label} eyes`} aria-pressed={draft.eye === k} onClick={() => set({ eye: k })} />
        ))}</div>
      </section>
    </>
  );
}

export default function Setup({ step }: { step: 'seal' | 'owl' }) {
  const { me, saveMe } = useStore();
  const [draft, setDraft] = useState<Profile | null>(me);
  if (!me || !draft) return null;
  const set = (p: Partial<Profile>) => setDraft({ ...draft, ...p });

  if (step === 'seal') {
    return (
      <main className="app">
        <div className="center stack" style={{ alignItems: 'center' }}>
          <div className="wordmark"><span style={{ fontSize: 64 }}>Signed</span></div>
          <h1>Design your seal</h1>
          <p className="muted">It closes every letter you send, and it's how your friends will know you.</p>
        </div>
        <SealDesigner draft={draft} set={set} />
        <div className="foot">
          <button className="btn wax" disabled={!draft.name.trim()} onClick={async () => {
            await saveMe({ name: draft.name.trim(), monogram: draft.monogram, wax: draft.wax, mixins: draft.mixins, edge: draft.edge ?? 'uneven', mark: draft.mark ?? null });
            go(me.onboarded ? 'profile' : 'setup/owl');
          }}>{me.onboarded ? 'Save my seal' : 'Press your seal'}</button>
        </div>
      </main>
    );
  }
  return (
    <main className="app">
      <Top title="Meet your owl" back="setup/seal" />
      <p className="muted">Your owl carries every letter you send. Make it yours.</p>
      <OwlEditor draft={draft} set={set} />
      <div className="foot">
        <button className="btn wax" onClick={async () => {
          await saveMe({ plume: draft.plume, eye: draft.eye, owl_name: draft.owl_name.trim() || 'Wren', onboarded: true });
          go('friends');
        }}>Start writing</button>
      </div>
    </main>
  );
}
