import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { timeLeft } from '../lib/format';
import { km, onIndiaMap, project, wander } from '../lib/geo';
import { Top } from '../components/bits';

export default function Flight({ id }: { id: string }) {
  const { me, letters, friend } = useStore();
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  const l = letters.find((x) => x.id === id);
  if (!me || !l) return <main className="app"><Top title="In flight" back="friends" /><p className="muted">Looking for your owl…</p></main>;
  const f = friend(l.recipient);
  const name = f?.profile.name ?? 'your friend';
  const t = Math.max(0, Math.min(1, (Date.now() - new Date(l.sent_at).getTime()) / (new Date(l.arrive_at).getTime() - new Date(l.sent_at).getTime() || 1)));
  const has = l.from_lat != null && l.to_lat != null;
  const dist = has ? Math.round(km([l.from_lat!, l.from_lon!], [l.to_lat!, l.to_lon!])) : null;
  const onMap = has && onIndiaMap(l.from_lat!, l.from_lon!) && onIndiaMap(l.to_lat!, l.to_lon!);

  let map = null;
  if (onMap) {
    const A = project(l.from_lat!, l.from_lon!), B = project(l.to_lat!, l.to_lon!);
    const pts = (n: number) => Array.from({ length: n + 1 }, (_, i) => wander(A, B, i / 60)).map((q) => `${(q[0] * 390).toFixed(1)},${(q[1] * 560).toFixed(1)}`).join(' ');
    const q = wander(A, B, t), q2 = wander(A, B, Math.min(1, t + 0.01));
    const ang = (Math.atan2((q2[1] - q[1]) * 560, (q2[0] - q[0]) * 390) * 180) / Math.PI + 90;
    map = (
      <div className="map">
        <img className="base" src="/assets/map-india.jpg" alt="Map of India" />
        <svg viewBox="0 0 390 560" preserveAspectRatio="none" aria-hidden="true">
          <line x1={A[0] * 390} y1={A[1] * 560} x2={B[0] * 390} y2={B[1] * 560} stroke="#2B2622" strokeOpacity=".25" strokeDasharray="2 5" />
          <polyline points={pts(60)} fill="none" stroke="#2B2622" strokeOpacity=".45" strokeWidth="1.4" strokeDasharray="1 6" strokeLinecap="round" />
          <polyline points={pts(Math.round(t * 60))} fill="none" stroke="#7A2420" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx={A[0] * 390} cy={A[1] * 560} r="5" fill="#7A2420" stroke="#FBF6EE" strokeWidth="2" />
          <circle cx={B[0] * 390} cy={B[1] * 560} r="5" fill="#2F5D50" stroke="#FBF6EE" strokeWidth="2" />
        </svg>
        <span className="pin" style={{ left: `${A[0] * 100}%`, top: `${A[1] * 100}%` }}>You</span>
        <span className="pin" style={{ left: `${B[0] * 100}%`, top: `${B[1] * 100}%` }}>{name}</span>
        <img className="flyer" src="/assets/owl-fly.png" alt={`${me.owl_name} in flight`} style={{ left: `${q[0] * 100}%`, top: `${q[1] * 100}%`, transform: `translate(-50%,-50%) rotate(${ang}deg)` }} />
      </div>
    );
  } else {
    map = (
      <div className="stone stack center" style={{ padding: 22 }}>
        <p>{has ? `${me.owl_name} is flying ${dist!.toLocaleString()} km, beyond the map we have drawn so far.` : `${me.owl_name} is on the way. Distance shows once you both share your location.`}</p>
      </div>
    );
  }

  return (
    <main className="app">
      <Top title="In flight" back={`friend/${l.recipient}`} />
      {map}
      <div className="stack" style={{ gap: 6 }}>
        <p style={{ fontSize: 20, fontWeight: 600 }}>{t >= 1 ? 'Delivered' : 'Your letter is on its way'}</p>
        <p className="muted">{t >= 1 ? `${me.owl_name} reached ${name}.` : `${me.owl_name} reaches ${name} in ${timeLeft(l.arrive_at)}.`}</p>
        <div className="bar"><i style={{ width: `${t * 100}%` }} /></div>
        {dist != null && <p className="small muted">{dist.toLocaleString()} km as the crow flies, to where {name} was last seen{l.to_place ? `, near ${l.to_place}` : ''}. {me.owl_name} wanders a little, as owls do.</p>}
      </div>
      <div className="foot"><button className="btn" onClick={() => go(`friend/${l.recipient}`)}>Done</button></div>
    </main>
  );
}
