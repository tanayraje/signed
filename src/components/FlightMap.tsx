import { onIndiaMap, project, wander } from '../lib/geo';

type LatLon = [number, number];

/**
 * The India map with two people on it and, while a letter is flying, the owl on its wandering path.
 * `zoom` crops the map to the two of them; otherwise the whole map shows.
 */
export default function FlightMap({ from, to, fromLabel, toLabel, t = null, flyerAlt = 'Owl in flight', zoom = false }: {
  from: LatLon; to: LatLon; fromLabel: string; toLabel: string; t?: number | null; flyerAlt?: string; zoom?: boolean;
}) {
  if (!onIndiaMap(from[0], from[1]) || !onIndiaMap(to[0], to[1])) return null;
  const A = project(from[0], from[1]), B = project(to[0], to[1]);

  // visible window, in 0..1 map units
  let x0 = 0, y0 = 0, wn = 1, hn = 1;
  const ratio = zoom ? 4 / 3 : 390 / 560; // container width / height
  if (zoom) {
    const bw = Math.abs(A[0] - B[0]), bh = Math.abs(A[1] - B[1]);
    const toH = (w: number) => (w * 390) / (560 * ratio);
    wn = Math.min(1, Math.max(0.42, bw + 0.3, ((bh + 0.22) * 560 * ratio) / 390));
    hn = Math.min(1, toH(wn));
    if (hn >= 1) { hn = 1; wn = Math.min(1, (560 * ratio) / 390); }
    const cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2;
    x0 = Math.min(1 - wn, Math.max(0, cx - wn / 2));
    y0 = Math.min(1 - hn, Math.max(0, cy - hn / 2));
  }

  const pts = (n: number) => Array.from({ length: n + 1 }, (_, i) => wander(A, B, i / 60)).map((q) => `${(q[0] * 390).toFixed(1)},${(q[1] * 560).toFixed(1)}`).join(' ');
  const flying = t != null && t < 1;
  const q = flying ? wander(A, B, t!) : null;
  const q2 = flying ? wander(A, B, Math.min(1, t! + 0.01)) : null;
  const ang = q && q2 ? (Math.atan2((q2[1] - q[1]) * 560, (q2[0] - q[0]) * 390) * 180) / Math.PI + 90 : 0;
  const k = 1 / Math.max(wn, 0.0001); // how much the inner layer is scaled up

  return (
    <div className="map" style={{ aspectRatio: String(ratio) }}>
      <div className="map-in" style={{ width: `${100 / wn}%`, height: `${100 / hn}%`, left: `${(-x0 / wn) * 100}%`, top: `${(-y0 / hn) * 100}%` }}>
        <img className="base" src="/assets/map-india.jpg" alt="Map of India" />
        <svg viewBox="0 0 390 560" preserveAspectRatio="none" aria-hidden="true">
          <line x1={A[0] * 390} y1={A[1] * 560} x2={B[0] * 390} y2={B[1] * 560} stroke="#2B2622" strokeOpacity=".25" strokeDasharray={`${2 / k} ${5 / k}`} strokeWidth={1 / k} />
          {t != null && <polyline points={pts(60)} fill="none" stroke="#2B2622" strokeOpacity=".45" strokeWidth={1.4 / k} strokeDasharray={`${1 / k} ${6 / k}`} strokeLinecap="round" />}
          {t != null && <polyline points={pts(Math.round(Math.min(1, t) * 60))} fill="none" stroke="#7A2420" strokeWidth={1.8 / k} strokeLinecap="round" />}
          <circle cx={A[0] * 390} cy={A[1] * 560} r={5 / k} fill="#7A2420" stroke="#FBF6EE" strokeWidth={2 / k} />
          <circle cx={B[0] * 390} cy={B[1] * 560} r={5 / k} fill="#2F5D50" stroke="#FBF6EE" strokeWidth={2 / k} />
        </svg>
        <span className="pin" style={{ left: `${A[0] * 100}%`, top: `${A[1] * 100}%` }}>{fromLabel}</span>
        <span className="pin" style={{ left: `${B[0] * 100}%`, top: `${B[1] * 100}%` }}>{toLabel}</span>
        {q && <img className="flyer" src="/assets/owl-fly.png" alt={flyerAlt} style={{ width: `${12 * wn}%`, left: `${q[0] * 100}%`, top: `${q[1] * 100}%`, transform: `translate(-50%,-50%) rotate(${ang}deg)` }} />}
      </div>
    </div>
  );
}
