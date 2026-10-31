import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { Seal, Stamp } from '../components/bits';

/** Press and hold the seal: it lifts off (kept for the calendar), the flap folds back, the letter rises. */
export default function Opening({ id }: { id: string }) {
  const { me, letters, friend, refresh } = useStore();
  const [opened, setOpened] = useState(false);
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  const l = letters.find((x) => x.id === id);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  if (!me || !l) return null;
  const f = friend(l.sender)?.profile;
  if (!f) return null;

  async function lift() {
    if (opened) return;
    setOpened(true);
    await supabase.rpc('open_letter', { letter_id: l!.id });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => { void refresh(); go(`read/${l!.id}`); }, reduce ? 400 : 2300);
  }
  const step = () => {
    const k = Math.min(1, (Date.now() - t0.current) / 800);
    setProgress(k);
    if (k >= 1) { void lift(); return; }
    raf.current = requestAnimationFrame(step);
  };

  return (
    <div className="slate">
      <main className="app" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 44 }}>
        <div className="stack" style={{ gap: 0 }}>
          <span className="muted" style={{ fontStyle: 'italic' }}>A letter from</span>
          <h1>{f.name}</h1>
        </div>
        <div className={`envwrap${opened ? ' opened' : ''}`}>
          <div className="env envback" />
          <div className="peek"><div style={{ fontStyle: 'italic', fontSize: 14, color: '#2B2622', textAlign: 'left', padding: '14px 16px', whiteSpace: 'pre-wrap', overflow: 'hidden', height: '100%' }}>{l.body.slice(0, 160)}</div></div>
          <div className="envfront">
            <svg viewBox="0 0 340 236" width="100%" height="100%" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
              <circle cx="70" cy="190" r="20" fill="none" stroke="#4B4038" strokeOpacity=".45" />
              <text x="70" y="187" textAnchor="middle" fontSize="8" fill="#4B4038">{(l.from_place ?? '').toUpperCase().slice(0, 14)}</text>
              <text x="70" y="198" textAnchor="middle" fontSize="8" fill="#4B4038">{new Date(l.sent_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }).toUpperCase()}</text>
            </svg>
            <div style={{ position: 'absolute', right: 16, bottom: 14 }}><Stamp id={l.stamp} /></div>
          </div>
          <div className="flap" />
          <button className="press" aria-label="Press and hold to lift the seal"
            onPointerDown={(e) => { e.preventDefault(); t0.current = Date.now(); raf.current = requestAnimationFrame(step); }}
            onPointerUp={() => { if (!opened) { cancelAnimationFrame(raf.current); setProgress(0); } }}
            onPointerLeave={() => { if (!opened) { cancelAnimationFrame(raf.current); setProgress(0); } }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void lift(); } }}>
            <Seal p={f} size={116} />
            {!opened && (
              <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: '-6%', width: '112%', height: '112%' }} aria-hidden="true">
                <circle cx="50" cy="50" r="48" fill="none" stroke="#E2C27A" strokeWidth="2" strokeDasharray="301.6" strokeDashoffset={301.6 * (1 - progress)} transform="rotate(-90 50 50)" />
              </svg>
            )}
          </button>
        </div>
        <p>{opened ? 'The seal is kept for your calendar.' : 'Press and hold the seal to lift it.'}</p>
        <div className="spacer" />
        <p className="small muted">Carried by {f.owl_name}, {f.name}'s owl{l.distance_km ? `, ${l.distance_km.toLocaleString()} km` : ''}</p>
      </main>
    </div>
  );
}
