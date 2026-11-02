import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { upload } from '../lib/media';
import { CUTTERS, FINISHES, aspectOf, bake, centreRect, cropSource, loadImage, type Cutter as CutterId, type Finish } from '../lib/stampcut';
import { Icon } from '../components/bits';


/** The perforated die window, drawn as a brass cutter. */
function Die({ w, h, oval, pressing }: { w: number; h: number; oval: boolean; pressing: boolean }) {
  const b = 22; // brass band
  const W = w + b * 2, H = h + b * 2;
  const r = 7, gap = r * 3.1;
  // window edge with perforation teeth biting in
  const teeth = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(4, Math.round(len / gap));
    const dx = (x2 - x1) / len, dy = (y2 - y1) / len;
    let d = '';
    for (let i = 0; i < n; i++) {
      const mx = x1 + dx * (len * (i + 0.5)) / n, my = y1 + dy * (len * (i + 0.5)) / n;
      const ex = x1 + dx * (len * (i + 1)) / n, ey = y1 + dy * (len * (i + 1)) / n;
      const ax = mx - dx * r, ay = my - dy * r, bx = mx + dx * r, by = my + dy * r;
      d += `L${ax.toFixed(1)} ${ay.toFixed(1)}A${r} ${r} 0 0 0 ${bx.toFixed(1)} ${by.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`;
    }
    return d;
  };
  const x0 = b, y0 = b, x1 = b + w, y1 = b + h;
  const hole = `M${x0} ${y0}` + teeth(x0, y0, x1, y0) + teeth(x1, y0, x1, y1) + teeth(x1, y1, x0, y1) + teeth(x0, y1, x0, y0) + 'Z';
  const outer = `M14 0H${W - 14}A14 14 0 0 1 ${W} 14V${H - 14}A14 14 0 0 1 ${W - 14} ${H}H14A14 14 0 0 1 0 ${H - 14}V14A14 14 0 0 1 14 0Z`;
  return (
    <svg className={`die${pressing ? ' pressing' : ''}`} width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ left: -b, top: -b }}>
      <defs>
        <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F1DCA2" /><stop offset=".22" stopColor="#B88A3E" /><stop offset=".48" stopColor="#E9CF8C" />
          <stop offset=".7" stopColor="#8E6526" /><stop offset="1" stopColor="#D9B46A" />
        </linearGradient>
        <linearGradient id="brassEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3CF" stopOpacity=".8" /><stop offset="1" stopColor="#5A3C12" stopOpacity=".8" /></linearGradient>
      </defs>
      <path d={outer + hole} fill="url(#brass)" fillRule="evenodd" />
      <path d={outer} fill="none" stroke="url(#brassEdge)" strokeWidth="1.5" />
      <path d={hole} fill="none" stroke="#4A3210" strokeOpacity=".7" strokeWidth="1.5" />
      {[[11, 11], [W - 11, 11], [11, H - 11], [W - 11, H - 11]].map(([cx, cy], i) => (
        <g key={i}><circle cx={cx} cy={cy} r="4.2" fill="#7A5620" /><circle cx={cx} cy={cy} r="3.2" fill="#E2C584" /><path d={`M${cx - 2.4} ${cy + 1}l4.8-2`} stroke="#6B4A18" strokeWidth="1" /></g>
      ))}
      {oval && <ellipse cx={b + w / 2} cy={b + h / 2} rx={w / 2 - 10} ry={h / 2 - 10} fill="none" stroke="#FBF8F1" strokeOpacity=".75" strokeWidth="1.2" strokeDasharray="4 5" />}
    </svg>
  );
}

type Stage = { kind: 'camera' } | { kind: 'preview'; photo: HTMLCanvasElement };

/** Full-screen stamp cutter. Inside a letter, `onDone` gets the new stamp (or null when closed). */
export default function Cutter({ onDone }: { onDone?: (stampId: string | null) => void }) {
  const { me, session, stamps, say, refresh } = useStore();
  const uid = session!.user.id;
  const video = useRef<HTMLVideoElement>(null);
  const win = useRef<HTMLDivElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [camError, setCamError] = useState<string | null>(null);
  const [cutter, setCutter] = useState<CutterId>('classic');
  const [stage, setStage] = useState<Stage>({ kind: 'camera' });
  const [pressing, setPressing] = useState(false);
  const [finish, setFinish] = useState<Finish>('natural');
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(false);
  const [cut, setCut] = useState(0);
  const toSend = stamps.filter((s) => s.owner === uid && s.status === 'mine').length;

  const aspect = aspectOf(cutter);
  const winW = Math.min(window.innerWidth * (aspect > 1 ? 0.8 : 0.66), aspect > 1 ? 340 : 290);
  const winH = winW / aspect;

  // camera on while on the camera stage
  useEffect(() => {
    if (stage.kind !== 'camera') return;
    let alive = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('none');
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        if (!alive) { s.getTracks().forEach((t) => t.stop()); return; }
        stream.current = s;
        if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => undefined); }
        setCamError(null);
      } catch {
        if (alive) setCamError('Signed cannot use the camera here. Allow camera access in your settings, or cut a stamp from a photo.');
      }
    })();
    return () => { alive = false; stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  }, [stage.kind, facing]);

  // bake the preview whenever the finish or caption changes
  useEffect(() => {
    if (stage.kind !== 'preview') return;
    let alive = true;
    const t = window.setTimeout(async () => {
      const blob = await bake(stage.photo, cutter, finish, caption.trim(), me?.name ?? '');
      if (!alive) return;
      setPreview((old) => { if (old) URL.revokeObjectURL(old.url); return { url: URL.createObjectURL(blob), blob }; });
    }, caption ? 250 : 0);
    return () => { alive = false; window.clearTimeout(t); };
  }, [stage, cutter, finish, caption, me?.name]);

  const shoot = useCallback(() => {
    const v = video.current, w = win.current;
    if (!v || !w || !v.videoWidth) return;
    const vr = v.getBoundingClientRect(), wr = w.getBoundingClientRect();
    const s = Math.max(vr.width / v.videoWidth, vr.height / v.videoHeight);
    const ox = vr.left + (vr.width - v.videoWidth * s) / 2, oy = vr.top + (vr.height - v.videoHeight * s) / 2;
    let x = (wr.left - ox) / s;
    const y = (wr.top - oy) / s, cw = wr.width / s, ch = wr.height / s;
    if (facing === 'user') x = v.videoWidth - x - cw; // the preview is mirrored
    let photo = cropSource(v, v.videoWidth, v.videoHeight, { x, y, w: cw, h: ch }, aspect);
    if (facing === 'user') {
      const m = document.createElement('canvas'); m.width = photo.width; m.height = photo.height;
      const c = m.getContext('2d')!; c.translate(m.width, 0); c.scale(-1, 1); c.drawImage(photo, 0, 0); photo = m;
    }
    setPressing(true);
    try { navigator.vibrate?.(18); } catch { /* not supported */ }
    window.setTimeout(() => { setPressing(false); setFinish('natural'); setCaption(''); setStage({ kind: 'preview', photo }); }, 380);
  }, [aspect, facing]);

  async function pick(file: File) {
    try {
      const img = await loadImage(file);
      const rect = centreRect(img.naturalWidth, img.naturalHeight, aspect);
      const photo = cropSource(img, img.naturalWidth, img.naturalHeight, rect, aspect);
      setFinish('natural'); setCaption(''); setStage({ kind: 'preview', photo });
    } catch (e) { say((e as Error).message); }
  }

  async function keep() {
    if (!preview) return;
    setBusy(true);
    try {
      const path = await upload(uid, preview.blob, 'png');
      const { data, error } = await supabase.from('stamps').insert({ owner: uid, made_by: uid, image_path: path, cutter, caption: caption.trim() || null }).select('id').single();
      if (error || !data) throw new Error('The stamp did not save. Try again.');
      await refresh();
      setCut((n) => n + 1);
      if (onDone) { say('Stamp cut and stuck on.'); onDone(data.id); return; }
      say(`Kept. ${toSend + 1} ${toSend + 1 === 1 ? 'stamp' : 'stamps'} ready to send.`);
      setStage({ kind: 'camera' });
    } catch (e) { say((e as Error).message); }
    setBusy(false);
  }

  function leave() {
    if (onDone) onDone(null); else go('stamps');
  }

  const picker = (
    <>
      <input id="stampPhoto" type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }} />
    </>
  );

  if (stage.kind === 'preview') {
    return (
      <div className="cutter cut-preview">
        <div className="cut-top">
          <button className="cut-icon" onClick={() => setStage({ kind: 'camera' })} aria-label="Retake">{Icon.back}</button>
          <span className="grow" />
        </div>
        <div className="cut-stage">
          {preview ? <img className="cut-result" src={preview.url} alt="Your new stamp" /> : <div style={{ width: 200, height: 250 }} />}
        </div>
        <div className="cut-panel stack">
          <div className="cut-seg" role="radiogroup" aria-label="Finish">
            {FINISHES.map((f) => <button key={f.id} role="radio" aria-checked={finish === f.id} className={finish === f.id ? 'on' : ''} onClick={() => setFinish(f.id)}>{f.label}</button>)}
          </div>
          <input type="text" className="cut-caption" maxLength={40} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Name this stamp (optional)" aria-label="Stamp name" />
          <div className="row" style={{ gap: 10 }}>
            <button className="btn cut-ghost" style={{ flex: 1 }} onClick={() => setStage({ kind: 'camera' })}>Retake</button>
            <button className="btn cut-keep" style={{ flex: 1.4 }} disabled={busy || !preview} onClick={keep}>{busy ? 'Keeping…' : 'Keep stamp'}</button>
          </div>
          <p className="cut-note">Once a stamp flies on a letter, it belongs to your friend.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cutter">
      <video ref={video} className={`cut-video${facing === 'user' ? ' mirror' : ''}`} playsInline muted autoPlay />
      <div className="cut-top">
        <button className="cut-icon" onClick={leave} aria-label="Close the cutter">{Icon.close}</button>
        <span className="grow center cut-title">{cut > 0 ? `${cut} cut` : 'Stamp cutter'}</span>
        <button className="cut-icon" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')} aria-label="Switch camera" disabled={Boolean(camError)}>{Icon.flip}</button>
      </div>

      <div className="cut-stage">
        <div ref={win} className={`cut-window${pressing ? ' pressing' : ''}`} style={{ width: winW, height: winH }}>
          <Die w={winW} h={winH} oval={cutter === 'oval'} pressing={pressing} />
        </div>
        {camError && <p className="cut-error">{camError}</p>}
      </div>

      <div className="cut-panel">
        <div className="cut-seg" role="radiogroup" aria-label="Cutter">
          {CUTTERS.map((c) => <button key={c.id} role="radio" aria-checked={cutter === c.id} className={cutter === c.id ? 'on' : ''} onClick={() => setCutter(c.id)}>{c.label}</button>)}
        </div>
        <div className="cut-controls">
          <label className="cut-icon big" htmlFor="stampPhoto" aria-label="Cut from a photo">{Icon.photos}</label>
          {picker}
          <button className="shutter" onClick={shoot} disabled={Boolean(camError) || pressing} aria-label="Cut the stamp" />
          <button className="cut-icon big" onClick={leave} aria-label={`Your stamps, ${toSend} ready to send`}>
            <span className="cut-count">{toSend}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
