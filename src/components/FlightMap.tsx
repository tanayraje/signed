import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPE, type WheelEvent as RWE } from 'react';
import { INDIA, pickMap, project, wander, type MapDef } from '../lib/geo';

type LatLon = [number, number];
export interface MapOwl { t: number; back?: boolean; alt?: string; plume?: string }

/**
 * The map with two people on it and every owl flying between them, live.
 * Interactive maps pan and pinch smoothly over the whole map (India up close, or the whole world);
 * pins, dots and owls keep their size while the map zooms. Previews are still, and open on tap.
 */
export default function FlightMap({ from, to, fromLabel, toLabel, owls = [], interactive = false, ratio, onOpen }: {
  from: LatLon; to: LatLon; fromLabel: string; toLabel: string; owls?: MapOwl[];
  interactive?: boolean; ratio?: number; onOpen?: () => void;
}) {
  const M = pickMap(from, to);
  const box = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  if (!M) return null;
  const aspect = ratio ?? 4 / 3;
  return (
    <div ref={box} className={`zmap${interactive ? ' live' : ''}`} style={{ aspectRatio: interactive ? undefined : String(aspect) }}
      onClick={!interactive ? onOpen : undefined} role={!interactive && onOpen ? 'button' : undefined}
      aria-label={!interactive && onOpen ? 'Open the map' : undefined}>
      {size.w > 0 && <Layer key={`${M.img}-${size.w}x${size.h}`} M={M} from={from} to={to} fromLabel={fromLabel} toLabel={toLabel}
        owls={owls} W={size.w} H={size.h} interactive={interactive} layer={layer} box={box} />}
    </div>
  );
}

function Layer({ M, from, to, fromLabel, toLabel, owls, W, H, interactive, layer, box }: {
  M: MapDef; from: LatLon; to: LatLon; fromLabel: string; toLabel: string; owls: MapOwl[]; W: number; H: number; interactive: boolean;
  layer: React.RefObject<HTMLDivElement>; box: React.RefObject<HTMLDivElement>;
}) {
  const A = project(from[0], from[1], M), B = project(to[0], to[1], M);
  const VW = M.vw, VH = M.vh;

  // the layer is the whole map, as wide as the frame at scale 1; the first view frames the two of you
  const cw = W, ch = W * (VH / VW);
  // full maps can zoom out until the whole map shows; previews always stay covered
  const minS = () => (interactive ? Math.min(W / cw, H / ch, 1) : Math.max(W / cw, H / ch));
  const clampT = (t: { s: number; x: number; y: number }) => {
    const s = Math.min(12, Math.max(minS(), t.s));
    const fit = (view: number, len: number, v: number) => (len <= view ? (view - len) / 2 : Math.min(0, Math.max(view - len, v)));
    return { s, x: fit(W, cw * s, t.x), y: fit(H, ch * s, t.y) };
  };
  const pad = M === INDIA ? 0.28 : 0.1;
  const bw = Math.abs(A[0] - B[0]) + pad, bh = Math.abs(A[1] - B[1]) + pad * (VW / VH) * 0.6;
  const fitS = Math.min(W / (bw * cw), H / (bh * ch), M === INDIA ? 5 : 6);
  const homeS = Math.max(minS(), fitS);
  const home = clampT({ s: homeS, x: W / 2 - ((A[0] + B[0]) / 2) * cw * homeS, y: H / 2 - ((A[1] + B[1]) / 2) * ch * homeS });

  // the live transform lives outside React, so dragging stays smooth
  const T = useRef(home);
  const raf = useRef(0);
  const [zs, setZs] = useState(home.s);
  const apply = (animate = false) => {
    const el = layer.current; if (!el) return;
    el.style.transition = animate ? 'transform .28s cubic-bezier(.2,.8,.2,1)' : 'none';
    el.style.transform = `translate3d(${T.current.x}px, ${T.current.y}px, 0) scale(${T.current.s})`;
    el.style.setProperty('--zs', String(T.current.s));
  };
  const schedule = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => apply()); };
  useEffect(() => { apply(); return () => cancelAnimationFrame(raf.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const settle = () => setZs(T.current.s);

  const zoomAt = (f: number, px: number, py: number, animate = true) => {
    const o = T.current, s = Math.min(12, Math.max(minS(), o.s * f)), k = s / o.s;
    T.current = clampT({ s, x: px - (px - o.x) * k, y: py - (py - o.y) * k });
    apply(animate); settle();
  };

  // gestures: one finger pans, two fingers pinch, double tap zooms in (or back home)
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ d: number; mx: number; my: number } | null>(null);
  const tapAt = useRef(0);
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function down(e: RPE) {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    touches.current.set(e.pointerId, local(e)); last.current = null;
    if (touches.current.size === 1) {
      const now = Date.now(), p = local(e);
      if (now - tapAt.current < 280) { tapAt.current = 0; if (T.current.s > home.s * 1.6) { T.current = home; apply(true); settle(); } else zoomAt(2.2, p.x, p.y); }
      else tapAt.current = now;
    }
  }
  function move(e: RPE) {
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, local(e));
    const p = [...touches.current.values()];
    const mx = p.length > 1 ? (p[0].x + p[1].x) / 2 : p[0].x, my = p.length > 1 ? (p[0].y + p[1].y) / 2 : p[0].y;
    const d = p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
    const l = last.current;
    if (l && (p.length > 1) === (l.d > 0)) {
      const o = T.current;
      const s = p.length > 1 ? Math.min(12, Math.max(minS(), o.s * (d / l.d))) : o.s, k = s / o.s;
      T.current = clampT({ s, x: mx - (l.mx - o.x) * k, y: my - (l.my - o.y) * k });
      schedule();
    }
    last.current = { d, mx, my };
  }
  function up(e: RPE) { touches.current.delete(e.pointerId); last.current = null; if (!touches.current.size) settle(); }
  function wheel(e: RWE) { const p = local(e); zoomAt(Math.exp(-e.deltaY / 400), p.x, p.y, false); }

  // where each owl is now, and which way it faces
  const flights = owls.filter((o) => o.t < 1).map((o) => {
    const at = o.back ? 1 - o.t : o.t, ahead = o.back ? Math.max(0, at - 0.01) : Math.min(1, at + 0.01);
    const q = wander(A, B, at), q2 = wander(A, B, ahead);
    return { ...o, q, ang: (Math.atan2((q2[1] - q[1]) * VH, (q2[0] - q[0]) * VW) * 180) / Math.PI + 90 };
  });
  const lead = flights[0];
  const pts = (n: number) => Array.from({ length: n + 1 }, (_, i) => wander(A, B, i / 60)).map((q) => `${(q[0] * VW).toFixed(1)},${(q[1] * VH).toFixed(1)}`).join(' ');
  const px = (n: number) => (n * VW) / (cw * zs); // screen pixels in map units, whatever the zoom
  const dash = (a: number, b: number) => `${px(a)} ${px(b)}`;

  return (
    <>
      <div ref={layer} className="zmap-layer" style={{ width: cw, height: ch }}>
        <img className="zmap-base" src={M.img} alt={M === INDIA ? 'Map of India' : 'Map of the world'} draggable={false} />
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden="true">
          <line x1={A[0] * VW} y1={A[1] * VH} x2={B[0] * VW} y2={B[1] * VH} stroke="#2B2622" strokeOpacity=".25" strokeDasharray={dash(2, 5)} strokeWidth={px(1)} />
          {lead && <polyline points={pts(60)} fill="none" stroke="#2B2622" strokeOpacity=".45" strokeWidth={px(1.6)} strokeDasharray={dash(1.5, 6)} strokeLinecap="round" />}
          {lead && !lead.back && <polyline points={pts(Math.round(Math.min(1, lead.t) * 60))} fill="none" stroke="#7A2420" strokeWidth={px(2.2)} strokeLinecap="round" />}
        </svg>
        <span className="zmap-dot from" style={{ left: `${A[0] * 100}%`, top: `${A[1] * 100}%` }} />
        <span className="zmap-dot to" style={{ left: `${B[0] * 100}%`, top: `${B[1] * 100}%` }} />
        <span className="zmap-pin" style={{ left: `${A[0] * 100}%`, top: `${A[1] * 100}%` }}>{fromLabel}</span>
        <span className="zmap-pin" style={{ left: `${B[0] * 100}%`, top: `${B[1] * 100}%` }}>{toLabel}</span>
        {flights.map((o, n) => (
          <img key={n} className="zmap-owl" src={o.plume ? `/assets/owl-fly-${o.plume}.png` : '/assets/owl-fly.png'} alt={o.alt ?? 'Owl in flight'} draggable={false}
            style={{ left: `${o.q[0] * 100}%`, top: `${o.q[1] * 100}%`, ['--a' as string]: `${o.ang}deg` }} />
        ))}
      </div>
      {interactive && <div className="zmap-touch" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel} />}
      {interactive && (
        <div className="zmap-btns">
          <button type="button" onClick={() => zoomAt(1.7, W / 2, H / 2)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomAt(1 / 1.7, W / 2, H / 2)} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => { T.current = home; apply(true); settle(); }} aria-label="Back to the two of you">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="6" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
          </button>
        </div>
      )}
    </>
  );
}
