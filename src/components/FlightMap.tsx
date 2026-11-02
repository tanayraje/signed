import { useRef, useState, type PointerEvent as RPE, type WheelEvent as RWE } from 'react';
import { onIndiaMap, project, wander } from '../lib/geo';

type LatLon = [number, number];

/**
 * The India map with two people on it and, while a letter is flying, the owl on its wandering path.
 * `zoom` crops the map to the two of them; otherwise the whole map shows.
 */
export default function FlightMap({ from, to, fromLabel, toLabel, t = null, flyerAlt = 'Owl in flight', zoom = false }: {
  from: LatLon; to: LatLon; fromLabel: string; toLabel: string; t?: number | null; flyerAlt?: string; zoom?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ d: number; mx: number; my: number; x: number; y: number } | null>(null);
  const tapAt = useRef(0);

  // keep the zoomed map covering its frame
  const clamp = (s: number, x: number, y: number) => {
    const r = box.current?.getBoundingClientRect(); if (!r) return { s, x, y };
    s = Math.min(5, Math.max(1, s));
    return { s, x: Math.min(0, Math.max(r.width - r.width * s, x)), y: Math.min(0, Math.max(r.height - r.height * s, y)) };
  };
  // zoom by factor f around a point (px, relative to the frame)
  const zoomAt = (f: number, px: number, py: number) => setZ((o) => {
    const s = Math.min(5, Math.max(1, o.s * f)), k = s / o.s;
    return clamp(s, px - (px - o.x) * k, py - (py - o.y) * k);
  });
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  function down(e: RPE) {
    touches.current.set(e.pointerId, local(e));
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    last.current = null;
    if (touches.current.size === 1) {
      const now = Date.now();
      if (now - tapAt.current < 300) { const p = local(e); if (z.s > 1.05) setZ({ s: 1, x: 0, y: 0 }); else zoomAt(2.5, p.x, p.y); tapAt.current = 0; }
      else tapAt.current = now;
    }
  }
  function move(e: RPE) {
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, local(e));
    const p = [...touches.current.values()];
    if (p.length >= 2) {
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), mx = (p[0].x + p[1].x) / 2, my = (p[0].y + p[1].y) / 2;
      const l = last.current;
      if (l) setZ((o) => {
        const s = Math.min(5, Math.max(1, o.s * (d / l.d))), k = s / o.s;
        return clamp(s, mx - (l.mx - o.x) * k, my - (l.my - o.y) * k);
      });
      last.current = { d, mx, my, x: 0, y: 0 };
    } else if (z.s > 1) {
      const l = last.current;
      if (l) setZ((o) => clamp(o.s, o.x + p[0].x - l.mx, o.y + p[0].y - l.my));
      last.current = { d: 0, mx: p[0].x, my: p[0].y, x: 0, y: 0 };
    }
  }
  function up(e: RPE) { touches.current.delete(e.pointerId); last.current = null; }
  function wheel(e: RWE) { if (!e.ctrlKey && z.s === 1 && e.deltaY > 0) return; const p = local(e); zoomAt(Math.exp(-e.deltaY / 300), p.x, p.y); }

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
    <div ref={box} className="map" style={{ aspectRatio: String(ratio), touchAction: z.s > 1 ? 'none' : 'pan-y' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
      <div className="map-zoom" style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})`, ['--zs' as string]: z.s }}>
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
      <div className="map-zoom-btns" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={(e) => { e.stopPropagation(); const r = box.current!.getBoundingClientRect(); zoomAt(1.6, r.width / 2, r.height / 2); }} aria-label="Zoom in">+</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); if (z.s / 1.6 <= 1.05) setZ({ s: 1, x: 0, y: 0 }); else { const r = box.current!.getBoundingClientRect(); zoomAt(1 / 1.6, r.width / 2, r.height / 2); } }} aria-label="Zoom out" disabled={z.s <= 1}>−</button>
      </div>
    </div>
  );
}
