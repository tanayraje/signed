import { useEffect, useRef, useState } from 'react';
import type { Profile } from '../lib/types';
import { timeLeft } from '../lib/format';
import { Owl, Seal, Stamp } from './bits';

/**
 * The send-off after "Sign and seal": the letter folds into its envelope and the flap closes.
 * Then your seal hovers over the flap: hold to press it into the wax. Once it's on, the stamp
 * goes on and your owl swoops in and carries it away.
 */
export default function SendOff({ me, to, stamp, arriveAt, onDone }: {
  me: Profile; to: Pick<Profile, 'name'>; stamp: string; arriveAt: string; onDone: () => void;
}) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [phase, setPhase] = useState<'fold' | 'hold' | 'sealed'>(reduce ? 'sealed' : 'fold');
  const [p, setP] = useState(0);
  const [holding, setHolding] = useState(false);
  const [end, setEnd] = useState(reduce);
  const tick = useRef<number>();
  const pRef = useRef(0);

  useEffect(() => {
    if (reduce) { const t = window.setTimeout(onDone, 2600); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => setPhase('hold'), 1900);
    return () => { window.clearTimeout(t); window.clearInterval(tick.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'sealed' || reduce) return;
    try { navigator.vibrate?.(30); } catch { /* no vibration */ }
    const a = window.setTimeout(() => setEnd(true), 2300);
    const b = window.setTimeout(onDone, 4600);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (dir: number) => {
    window.clearInterval(tick.current);
    tick.current = window.setInterval(() => {
      pRef.current = Math.max(0, Math.min(1, pRef.current + dir));
      setP(pRef.current);
      if (pRef.current >= 1) { window.clearInterval(tick.current); setHolding(false); setPhase('sealed'); }
      else if (pRef.current <= 0) window.clearInterval(tick.current);
    }, 30);
  };
  const press = (e: React.PointerEvent) => { e.preventDefault(); if (phase !== 'hold') return; setHolding(true); run(0.045); };
  const lift = () => { if (!holding || phase !== 'hold') return; setHolding(false); run(-0.06); };

  const sealed = phase === 'sealed';
  const scale = sealed ? 1 : 1.8 - 0.8 * p;

  return (
    <div className={`sendoff${reduce ? ' still' : ''}${sealed ? ' sealed' : ''}`} onClick={sealed ? onDone : undefined} role="status" aria-live="polite">
      <div className="so-stage" aria-hidden={phase !== 'hold'}>
        <div className="so-carry">
          <div className="so-env">
            <div className="so-paper"><i className="p1" /><i className="p2" /><i className="p3" /></div>
            <div className="so-pocket" />
            <div className="so-flap" />
            <div className={`so-seal${phase !== 'fold' ? ' show' : ''}`} style={{ transform: `scale(${scale})` }}>
              <div className={sealed ? 'so-pop' : phase === 'hold' && !holding ? 'so-bob' : undefined}><Seal p={me} size={58} /></div>
            </div>
            <div className="so-stamp"><Stamp id={stamp} size={36} /></div>
            <span className="so-to">For {to.name}</span>
          </div>
        </div>
        {phase === 'hold' && <>
          <svg className="so-hold-ring" width="104" height="104" viewBox="0 0 104 104" aria-hidden="true">
            <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(243,227,181,.18)" strokeWidth="2.5" />
            <circle cx="52" cy="52" r="46" fill="none" stroke="#C9A24A" strokeWidth="3" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={289 * (1 - p)} />
          </svg>
          <button className="so-hold" aria-label="Hold to seal your letter" onPointerDown={press} onPointerUp={lift} onPointerLeave={lift} onPointerCancel={lift} onContextMenu={(e) => e.preventDefault()} />
        </>}
        <div className="so-owl"><Owl p={me} width={86} /></div>
        <span className="so-ring" />
      </div>
      <div className={`so-hint${phase === 'hold' ? ' in' : ''}`} aria-live="polite">
        <p>{holding ? 'Keep holding…' : 'Hold to seal'}</p>
        <span className="small">{holding ? 'Pressing your seal into the wax' : 'Press and hold your seal'}</span>
      </div>
      <div className={`so-words${end ? ' in' : ''}`}>
        <h1>Signed and sealed</h1>
        <p>{me.owl_name} is on the way to {to.name}. Lands in {timeLeft(arriveAt)}.</p>
        <span className="small">Tap to watch the flight</span>
      </div>
    </div>
  );
}
