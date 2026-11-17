import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPE, type ReactNode, type WheelEvent as RWE } from 'react';
import { INDIA, PLACES, onMap, pickMap, project, unproject, wander, whereabouts, type MapDef } from '../lib/geo';
import { FlyingOwl, Icon } from './bits';

type LatLon = [number, number];
/** One owl in the air. `name` and `note` fill the card that opens when you tap it; `ench` flies it by night. */
export interface MapOwl { t: number; back?: boolean; alt?: string; plume?: string; wax?: string; ench?: boolean; name?: string; note?: string }

/**
 * The map with two people on it and every owl flying between them, live.
 * Interactive maps pan and pinch smoothly over the whole map (India up close, or the whole world);
 * pins, seals and owls keep their size while the map zooms. Tap an owl to follow it or say hoo.
 * Previews are still, and open on tap.
 */
export default function FlightMap({ from, to, fromLabel, toLabel, fromPin, toPin, owls = [], interactive = false, ratio, onOpen }: {
  from: LatLon; to: LatLon; fromLabel: string; toLabel: string; fromPin?: ReactNode; toPin?: ReactNode; owls?: MapOwl[];
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
  // an enchanted letter in the lead turns the whole map to night
  const night = !!owls.find((o) => o.t < 1)?.ench;
  return (
    <div ref={box} className={`zmap${interactive ? ' live' : ''}${night ? ' night' : ''}`} style={{ aspectRatio: interactive ? undefined : String(aspect) }}
      onClick={!interactive ? onOpen : undefined} role={!interactive && onOpen ? 'button' : undefined}
      aria-label={!interactive && onOpen ? 'Open the map' : undefined}>
      {size.w > 0 && <Layer key={`${M.img}-${size.w}x${size.h}`} M={M} from={from} to={to} fromLabel={fromLabel} toLabel={toLabel} fromPin={fromPin} toPin={toPin}
        owls={owls} W={size.w} H={size.h} interactive={interactive} night={night} layer={layer} box={box} />}
    </div>
  );
}

// how far off the ground an owl is: it lifts off over the first stretch and comes down over the last
const lift = (t: number) => { const a = Math.max(0, Math.min(1, Math.min(t, 1 - t) / 0.04)); return a * a * (3 - 2 * a); };

function Layer({ M, from, to, fromLabel, toLabel, fromPin, toPin, owls, W, H, interactive, night, layer, box }: {
  M: MapDef; from: LatLon; to: LatLon; fromLabel: string; toLabel: string; fromPin?: ReactNode; toPin?: ReactNode; owls: MapOwl[]; W: number; H: number;
  interactive: boolean; night: boolean; layer: React.RefObject<HTMLDivElement>; box: React.RefObject<HTMLDivElement>;
}) {
  const A = project(from[0], from[1], M), B = project(to[0], to[1], M);
  const VW = M.vw, VH = M.vh;

  // the layer is the whole map, as wide as the frame at scale 1; the first view frames the two of you
  const cw = W, ch = W * (VH / VW);
  // full maps can zoom out until the whole map shows; previews always stay covered
  // never zoom past what the map image can draw sharply
  const maxS = Math.max(2, (M.px * 1.5) / (cw * (window.devicePixelRatio || 2)));
  const minS = () => (interactive ? Math.min(W / cw, H / ch, 1) : Math.max(W / cw, H / ch));
  const clampT = (t: { s: number; x: number; y: number }) => {
    const s = Math.min(maxS, Math.max(minS(), t.s));
    const fit = (view: number, len: number, v: number) => (len <= view ? (view - len) / 2 : Math.min(0, Math.max(view - len, v)));
    return { s, x: fit(W, cw * s, t.x), y: fit(H, ch * s, t.y) };
  };
  const pad = M === INDIA ? 0.28 : 0.1;
  const bw = Math.abs(A[0] - B[0]) + pad, bh = Math.abs(A[1] - B[1]) + pad * (VW / VH) * 0.6;
  const fitS = Math.min(W / (bw * cw), H / (bh * ch), maxS * 0.6);
  const homeS = Math.max(minS(), fitS);
  const home = clampT({ s: homeS, x: W / 2 - ((A[0] + B[0]) / 2) * cw * homeS, y: H / 2 - ((A[1] + B[1]) / 2) * ch * homeS });

  // the live transform lives outside React, so dragging stays smooth
  const T = useRef(home);
  const raf = useRef(0);
  const [zs, setZs] = useState(home.s);
  const apply = (animate: boolean | 'glide' = false) => {
    const el = layer.current; if (!el) return;
    // the layer is resized, not stretched, so the map and owls are drawn sharp at every zoom
    const ease = animate === 'glide' ? '1s linear' : '.28s cubic-bezier(.2,.8,.2,1)';
    el.style.transition = animate ? `transform ${ease}, width ${ease}, height ${ease}` : 'none';
    el.style.width = `${cw * T.current.s}px`;
    el.style.height = `${ch * T.current.s}px`;
    el.style.transform = `translate3d(${T.current.x}px, ${T.current.y}px, 0)`;
  };
  const schedule = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => apply()); };
  useEffect(() => { apply(); return () => cancelAnimationFrame(raf.current); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const settle = () => setZs(T.current.s);

  const zoomAt = (f: number, px: number, py: number, animate = true) => {
    const o = T.current, s = Math.min(maxS, Math.max(minS(), o.s * f)), k = s / o.s;
    T.current = clampT({ s, x: px - (px - o.x) * k, y: py - (py - o.y) * k });
    apply(animate); settle();
  };

  // where each owl is now, which way it faces, and how high it is
  const flights = owls.filter((o) => o.t < 1).map((o) => {
    const at = o.back ? 1 - o.t : o.t, ahead = o.back ? Math.max(0, at - 0.01) : Math.min(1, at + 0.01);
    const q = wander(A, B, at), q2 = wander(A, B, ahead);
    return { ...o, at, q, up: lift(o.t), ang: (Math.atan2((q2[1] - q[1]) * VH, (q2[0] - q[0]) * VW) * 180) / Math.PI + 90 };
  });
  const lead = flights[0];

  // tap an owl: a card opens, and from there you can follow it across the map or say hoo
  const [sel, setSel] = useState<number | null>(null);
  const [follow, setFollowState] = useState(false);
  const [hoot, setHoot] = useState<number | null>(null);
  const following = useRef(false);
  const setFollow = (v: boolean) => { following.current = v; setFollowState(v); };
  const hootT = useRef(0);
  useEffect(() => () => window.clearTimeout(hootT.current), []);
  const cur = sel != null ? flights[sel] : undefined;
  useEffect(() => { if (sel != null && !cur) { setSel(null); setFollow(false); } }, [sel, cur]); // eslint-disable-line react-hooks/exhaustive-deps
  const fx = cur?.q[0], fy = cur?.q[1];
  const began = useRef(false);
  useEffect(() => {
    if (!follow || fx == null || fy == null) { began.current = false; return; }
    // the first move swoops in; after that the map glides along with the owl
    const s = began.current ? T.current.s : Math.max(T.current.s, Math.min(maxS, home.s * 2));
    T.current = clampT({ s, x: W / 2 - fx * cw * s, y: H * 0.42 - fy * ch * s });
    apply(began.current ? 'glide' : true); began.current = true; settle();
  }, [follow, fx, fy]); // eslint-disable-line react-hooks/exhaustive-deps
  const sayHoo = () => {
    if (sel == null) return;
    window.clearTimeout(hootT.current);
    setHoot(sel);
    try { navigator.vibrate?.(15); } catch { /* no haptics here */ }
    hootT.current = window.setTimeout(() => setHoot(null), 950);
  };
  const goHome = () => { setFollow(false); T.current = home; apply(true); settle(); };

  // gestures: one finger pans, two fingers pinch, double tap zooms in (or back home), a single tap picks an owl
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const last = useRef<{ d: number; mx: number; my: number } | null>(null);
  const tapAt = useRef(0);
  const press = useRef<{ x: number; y: number; at: number } | null>(null);
  const local = (e: { clientX: number; clientY: number }) => { const r = box.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function down(e: RPE) {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    touches.current.set(e.pointerId, local(e)); last.current = null;
    if (touches.current.size === 1) {
      const now = Date.now(), p = local(e);
      press.current = { ...p, at: now };
      if (now - tapAt.current < 280) { tapAt.current = 0; if (T.current.s > home.s * 1.6) goHome(); else zoomAt(2.2, p.x, p.y); }
      else tapAt.current = now;
    } else press.current = null;
  }
  function move(e: RPE) {
    if (!touches.current.has(e.pointerId)) return;
    touches.current.set(e.pointerId, local(e));
    const p = [...touches.current.values()];
    const mx = p.length > 1 ? (p[0].x + p[1].x) / 2 : p[0].x, my = p.length > 1 ? (p[0].y + p[1].y) / 2 : p[0].y;
    const d = p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
    if (press.current && Math.hypot(mx - press.current.x, my - press.current.y) > 8) press.current = null;
    const l = last.current;
    if (l && (p.length > 1) === (l.d > 0) && !press.current) {
      const o = T.current;
      const s = p.length > 1 ? Math.min(maxS, Math.max(minS(), o.s * (d / l.d))) : o.s, k = s / o.s;
      T.current = clampT({ s, x: mx - (l.mx - o.x) * k, y: my - (l.my - o.y) * k });
      if (following.current) setFollow(false); // dragging the map lets go of the owl
      schedule();
    }
    last.current = { d, mx, my };
  }
  function up(e: RPE) {
    const p = press.current;
    touches.current.delete(e.pointerId); last.current = null; press.current = null;
    if (touches.current.size) return;
    settle();
    if (!p || Date.now() - p.at > 400) return;
    let hit = -1, best = 36;
    flights.forEach((o, n) => {
      const dist = Math.hypot(T.current.x + o.q[0] * cw * T.current.s - p.x, T.current.y + o.q[1] * ch * T.current.s - p.y);
      if (dist < best) { best = dist; hit = n; }
    });
    if (hit >= 0) { tapAt.current = 0; setSel(hit); }
  }
  function cancel(e: RPE) { touches.current.delete(e.pointerId); last.current = null; press.current = null; if (!touches.current.size) settle(); }
  function wheel(e: RWE) { const p = local(e); zoomAt(Math.exp(-e.deltaY / 400), p.x, p.y, false); }

  // the route, and the stretch each lead owl has already flown
  const xy = (q: number[]) => `${(q[0] * VW).toFixed(1)},${(q[1] * VH).toFixed(1)}`;
  const route = Array.from({ length: 61 }, (_, i) => xy(wander(A, B, i / 60))).join(' ');
  const flown = (o: { at: number; back?: boolean }) => {
    const n = Math.floor(o.at * 60);
    const done = o.back ? Array.from({ length: 60 - n }, (_, i) => (n + 1 + i) / 60) : Array.from({ length: n + 1 }, (_, i) => i / 60);
    const ts = o.back ? [o.at, ...done] : [...done, o.at];
    return ts.map((t) => xy(wander(A, B, t))).join(' ');
  };
  const px = (n: number) => (n * VW) / (cw * zs); // screen pixels in map units, whatever the zoom
  const dash = (a: number, b: number) => `${px(a)} ${px(b)}`;
  const ink = night ? '#F1E7CF' : '#2B2622';
  const trail = (o: MapOwl) => (o.ench ? '#E2C27A' : o.back ? '#2F5D50' : '#7A2420');

  // places on this map: names fade in as you zoom, and by night they are city lights
  const places = useMemo(() => PLACES.filter((p) => onMap(M, p[1], p[2])).map((p) => ({ name: p[0], q: project(p[1], p[2], M) }))
    .filter((p) => Math.hypot(p.q[0] - A[0], p.q[1] - A[1]) > 0.035 && Math.hypot(p.q[0] - B[0], p.q[1] - B[1]) > 0.035), [M, A[0], A[1], B[0], B[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = interactive && zs > home.s * 1.5;
  const at = (q: number[]): CSSProperties => ({ left: `${q[0] * 100}%`, top: `${q[1] * 100}%` });
  const dest = lead ? (lead.back ? A : B) : null;
  // a few sparks trail behind an enchanted owl, the same distance back at any zoom
  const span = Math.hypot((B[0] - A[0]) * cw, (B[1] - A[1]) * ch) * zs || 1; // the route's length on screen
  const sparks = lead?.ench && lead.up > 0.5 ? [30, 46, 60].map((d) => wander(A, B, Math.max(0, Math.min(1, lead.at + ((lead.back ? d : -d) / span))))) : [];
  const where = cur ? whereabouts(...unproject(cur.q[0], cur.q[1], M)) : '';

  return (
    <>
      <div ref={layer} className={`zmap-layer${close ? ' close' : ''}`}>
        <img className="zmap-base" src={M.img} alt={M === INDIA ? 'Map of India' : 'Map of the world'} draggable={false} />
        {night && <span className="zmap-dusk" />}
        {interactive && !night && <><span className="zmap-cloud shade c1" /><span className="zmap-cloud shade c2" /></>}
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden="true">
          <line x1={A[0] * VW} y1={A[1] * VH} x2={B[0] * VW} y2={B[1] * VH} stroke={ink} strokeOpacity=".25" strokeDasharray={dash(2, 5)} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {lead && <polyline points={route} fill="none" stroke={ink} strokeOpacity=".45" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeDasharray={dash(1.5, 6)} strokeLinecap="round" />}
          {lead && <polyline className={lead.ench ? 'zmap-gilt' : undefined} points={flown(lead)} fill="none" stroke={trail(lead)} strokeWidth="2.2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />}
        </svg>
        {(interactive || night) && places.map((p) => <span key={p.name} className="zmap-place" style={at(p.q)}><i />{interactive && <b>{p.name}</b>}</span>)}
        {dest && lead.t > 0.96 && <span className="zmap-ring" style={at(dest)} />}
        {fromPin ? <span className="zmap-seal" style={at(A)}>{fromPin}</span> : <span className="zmap-dot from" style={at(A)} />}
        {toPin ? <span className="zmap-seal" style={at(B)}>{toPin}</span> : <span className="zmap-dot to" style={at(B)} />}
        <span className={`zmap-pin${fromPin ? ' high' : ''}`} style={at(A)}>{fromLabel}</span>
        <span className={`zmap-pin${toPin ? ' high' : ''}`} style={at(B)}>{toLabel}</span>
        {sparks.map((q, n) => <span key={n} className="zmap-spark" style={{ ...at(q), animationDelay: `${-n * 0.35}s` }} />)}
        {flights.map((o, n) => (
          <span key={n} className={`zmap-fly${o.ench ? ' gilded' : ''}`} style={{ ...at(o.q), ['--a' as string]: `${o.ang}deg`, ['--up' as string]: o.up }}>
            <span className="zmap-shade" />
            <span className="zmap-bird"><span className={hoot === n ? 'zmap-roll' : undefined}><FlyingOwl plume={o.plume} wax={o.wax} gilded={o.ench} alt={o.alt ?? 'Owl in flight'} /></span></span>
            {hoot === n && <span className="zmap-hoo">hoo!</span>}
          </span>
        ))}
        {interactive && !night && <><span className="zmap-cloud c1" /><span className="zmap-cloud c2" /></>}
      </div>
      {interactive && <div className="zmap-touch" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onWheel={wheel} />}
      {interactive && (
        <div className="zmap-btns">
          <button type="button" onClick={() => zoomAt(1.7, W / 2, H / 2)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoomAt(1 / 1.7, W / 2, H / 2)} aria-label="Zoom out">−</button>
          <button type="button" onClick={goHome} aria-label="Back to the two of you">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="6" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
          </button>
        </div>
      )}
      {interactive && cur && (
        <div className="zmap-card" role="group" aria-label="Flight details">
          <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
            <div className="grow stack" style={{ gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: 17 }}>{cur.name ?? 'The owl'} is {where}</span>
              {cur.note && <span className="small muted">{cur.note}</span>}
            </div>
            <button type="button" className="icon" onClick={() => { setSel(null); setFollow(false); }} aria-label="Close flight details">{Icon.close}</button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="zmap-act wax" aria-pressed={follow} onClick={() => setFollow(!follow)}>{follow ? 'Stop following' : `Follow ${cur.name ?? 'the owl'}`}</button>
            <button type="button" className="zmap-act" onClick={sayHoo}>Say hoo</button>
          </div>
        </div>
      )}
    </>
  );
}
