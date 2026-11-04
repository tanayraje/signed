import { useEffect, useState } from 'react';
import type { Profile } from '../lib/types';
import { timeLeft } from '../lib/format';
import { Owl, Seal, Stamp } from './bits';

/**
 * The send-off after "Sign and seal": the letter folds into its envelope, the flap closes,
 * your seal presses down, the stamp goes on, and your owl swoops in and carries it away.
 */
export default function SendOff({ me, to, stamp, arriveAt, onDone }: {
  me: Profile; to: Pick<Profile, 'name'>; stamp: string; arriveAt: string; onDone: () => void;
}) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [end, setEnd] = useState(reduce);
  useEffect(() => {
    if (reduce) { const t = window.setTimeout(onDone, 2600); return () => window.clearTimeout(t); }
    const a = window.setTimeout(() => setEnd(true), 3900);
    const b = window.setTimeout(onDone, 6200);
    try { navigator.vibrate?.([0, 1250, 30]); } catch { /* no vibration */ }
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`sendoff${reduce ? ' still' : ''}`} onClick={onDone} role="status" aria-live="polite">
      <div className="so-stage" aria-hidden="true">
        <div className="so-carry">
          <div className="so-env">
            <div className="so-paper"><i className="p1" /><i className="p2" /><i className="p3" /></div>
            <div className="so-pocket" />
            <div className="so-flap" />
            <div className="so-seal"><Seal p={me} size={58} /></div>
            <div className="so-stamp"><Stamp id={stamp} size={36} /></div>
            <span className="so-to">For {to.name}</span>
          </div>
        </div>
        <div className="so-owl"><Owl p={me} width={86} /></div>
        <span className="so-ring" />
      </div>
      <div className={`so-words${end ? ' in' : ''}`}>
        <h1>Signed and sealed</h1>
        <p>{me.owl_name} is on the way to {to.name}. Lands in {timeLeft(arriveAt)}.</p>
        <span className="small">Tap to watch the flight</span>
      </div>
    </div>
  );
}
