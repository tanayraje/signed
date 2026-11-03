import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { Seal } from '../components/bits';

export default function Wish({ onClose }: { onClose?: () => void }) {
  const { me, friends, session, say } = useStore();
  const [done, setDone] = useState(false);
  const [fill, setFill] = useState(0);
  const raf = useRef(0);
  const t0 = useRef(0);
  if (!me) return null;
  const close = () => (onClose ? onClose() : go('wall'));
  const together = friends.filter((f) => f.mine.wish_1111 && f.theirs?.wish_1111).map((f) => f.profile);
  const names = together.map((p) => p.name).join(' and ');

  async function wish() {
    if (done) return;
    setDone(true);
    if (together.length) {
      const { error } = await supabase.from('wishes').insert(together.map((p) => ({ sender: session!.user.id, recipient: p.id })));
      if (error) say('Your wish did not reach them. It still counts.');
    }
  }
  const step = () => {
    const k = Math.min(1, (Date.now() - t0.current) / 1200);
    setFill(k);
    if (k >= 1) { void wish(); return; }
    raf.current = requestAnimationFrame(step);
  };
  const stop = () => { if (!done) { cancelAnimationFrame(raf.current); setFill(0); } };

  return (
    <div className="wish" role="dialog" aria-modal="true" aria-label="11:11 wish">
      <StarField />
      <div className="comet" aria-hidden="true" />
      <main className="app">
        <span className="small" style={{ color: '#C9BFA8' }}>Wish alarm</span>
        <span style={{ fontSize: 96, lineHeight: 1, color: '#F3E3B5' }}>11:11</span>
        <div className="row" style={{ justifyContent: 'center', gap: 18, marginTop: 28, flexWrap: 'wrap' }}>
          <span className="ringing"><Seal p={me} size={72} label="Your seal" /></span>
          {together.map((p) => <span key={p.id} className="ringing"><Seal p={p} size={72} label={`${p.name}'s seal`} /></span>)}
        </div>
        <div className="stack" style={{ marginTop: 18 }}>
          {done ? (
            <>
              <h1 style={{ fontWeight: 400, fontStyle: 'italic', color: '#F3E3B5' }}>Wished together</h1>
              <p style={{ color: '#C9BFA8' }}>{together.length ? `Your wish is on its way to ${names}. Keep it to yourselves.` : 'Keep it to yourself.'}</p>
            </>
          ) : (
            <>
              <h1 style={{ fontWeight: 400, fontStyle: 'italic', color: '#F1E7CF' }}>{together.length ? 'Make a wish, together' : 'Make a wish'}</h1>
              <p style={{ color: '#C9BFA8' }}>{together.length ? `${names}${together.length > 1 ? "'s alarms are" : "'s alarm is"} ringing too.` : 'Turn on 11:11 with a friend on their page to wish together.'}</p>
            </>
          )}
        </div>
        <div className="spacer" />
        <div className="stack" style={{ width: '100%' }}>
          {done ? (
            <button className="btn block" style={{ color: '#F3E3B5', borderColor: '#E2C27A' }} onClick={close}>Done</button>
          ) : (
            <>
              <button className="btn block hold" style={{ background: '#E2C27A', borderColor: '#E2C27A', color: '#0F1424', fontWeight: 600, minHeight: 60 }}
                onPointerDown={(e) => { e.preventDefault(); t0.current = Date.now(); raf.current = requestAnimationFrame(step); }}
                onPointerUp={stop} onPointerLeave={stop}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void wish(); } }}>
                <span className="fill" style={{ width: `${fill * 100}%` }} />
                <span style={{ position: 'relative' }}>Hold to make your wish</span>
              </button>
              <button className="btn block" style={{ color: '#F1E7CF', borderColor: '#3B4566' }} onClick={close}>Not now</button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/** A quiet sky: small stars twinkling at their own pace behind the comet. */
function StarField() {
  const [stars] = useState(() => Array.from({ length: 70 }, () => ({
    l: Math.random() * 100, t: Math.random() * 100, s: Math.random() < 0.15 ? 2.4 : Math.random() < 0.5 ? 1.6 : 1.1,
    d: 2.5 + Math.random() * 4, delay: -Math.random() * 6, o: 0.25 + Math.random() * 0.45
  })));
  return (
    <div className="stars" aria-hidden="true">
      {stars.map((x, i) => <i key={i} style={{ left: `${x.l}%`, top: `${x.t}%`, width: x.s, height: x.s, animationDuration: `${x.d}s`, animationDelay: `${x.delay}s`, ['--o' as string]: x.o }} />)}
    </div>
  );
}
