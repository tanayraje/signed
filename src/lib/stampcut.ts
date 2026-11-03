/** Cutting stamps: the die shapes, and baking a photo into a perforated stamp image. */

export type Cutter = 'classic' | 'square' | 'wide' | 'oval';
export type Finish = 'natural' | 'vintage' | 'engraved';

export const CUTTERS: { id: Cutter; label: string; aspect: number }[] = [
  { id: 'classic', label: 'Classic', aspect: 4 / 5 },
  { id: 'square', label: 'Square', aspect: 1 },
  { id: 'wide', label: 'Wide', aspect: 5 / 4 },
  { id: 'oval', label: 'Cameo', aspect: 4 / 5 }
];
export const FINISHES: { id: Finish; label: string }[] = [
  { id: 'natural', label: 'Natural' },
  { id: 'vintage', label: 'Faded' },
  { id: 'engraved', label: 'Engraved' }
];
export const aspectOf = (c: Cutter) => CUTTERS.find((x) => x.id === c)!.aspect;

const PAPER = '#FBF8F1';
/** Long side of a baked stamp, in pixels. */
const LONG = 640;

/** Copy the part of a source (video frame or photo) that falls inside the die window. */
export function cropSource(src: CanvasImageSource, sw: number, sh: number, rect: { x: number; y: number; w: number; h: number }, aspect: number): HTMLCanvasElement {
  const w = aspect >= 1 ? LONG : Math.round(LONG * aspect);
  const h = aspect >= 1 ? Math.round(LONG / aspect) : LONG;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const x = Math.max(0, Math.min(sw - rect.w, rect.x));
  const y = Math.max(0, Math.min(sh - rect.h, rect.y));
  ctx.drawImage(src, x, y, rect.w, rect.h, 0, 0, w, h);
  return c;
}

/** The centred crop of a whole photo for a cutter's shape. */
export function centreRect(sw: number, sh: number, aspect: number) {
  let w = sw, h = sw / aspect;
  if (h > sh) { h = sh; w = sh * aspect; }
  return { x: (sw - w) / 2, y: (sh - h) / 2, w, h };
}

function finishPixels(ctx: CanvasRenderingContext2D, w: number, h: number, finish: Finish) {
  if (finish === 'natural') {
    const d = ctx.getImageData(0, 0, w, h); const p = d.data;
    for (let i = 0; i < p.length; i += 4) { // a touch of print warmth
      p[i] = Math.min(255, p[i] * 0.97 + 8); p[i + 1] = p[i + 1] * 0.97 + 5; p[i + 2] = p[i + 2] * 0.94 + 2;
    }
    ctx.putImageData(d, 0, 0);
    return;
  }
  const d = ctx.getImageData(0, 0, w, h); const p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const n = (Math.random() - 0.5) * 18;
    if (finish === 'vintage') {
      // faded print: lifted blacks, warm cast, a little grain
      const mix = (c: number, warm: number) => 30 + (c * 0.62 + y * 0.28) * 0.78 + warm + n;
      p[i] = mix(r, 22); p[i + 1] = mix(g, 12); p[i + 2] = mix(b, -6);
    } else {
      // engraved: one ink on cream, crisp contrast, line texture
      const line = ((i / 4) % w + Math.floor(i / 4 / w)) % 5 < 1 ? 14 : 0;
      const t = Math.max(0, Math.min(1, (y - 40) / 180 + n / 255)) ;
      const ink = [38, 52, 92], paper = [244, 237, 222];
      for (let k = 0; k < 3; k++) p[i + k] = ink[k] + (paper[k] - ink[k]) * t - line * (1 - t);
    }
  }
  ctx.putImageData(d, 0, 0);
}

/** Bake a cropped photo into a finished stamp: paper border, finish, caption and perforated edge. */
export async function bake(photo: HTMLCanvasElement, cutter: Cutter, finish: Finish, caption: string, maker: string): Promise<Blob> {
  const pw = photo.width, ph = photo.height;
  const m = Math.round(Math.max(pw, ph) * 0.075); // paper margin
  const capH = caption ? Math.round(m * 0.9) : 0;
  const W = pw + m * 2, H = ph + m * 2 + capH;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);

  // the picture, finished
  const pic = document.createElement('canvas'); pic.width = pw; pic.height = ph;
  const pc = pic.getContext('2d')!; pc.drawImage(photo, 0, 0); finishPixels(pc, pw, ph, finish);
  ctx.save();
  if (cutter === 'oval') {
    ctx.beginPath(); ctx.ellipse(m + pw / 2, m + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2); ctx.clip();
  }
  ctx.drawImage(pic, m, m);
  ctx.restore();

  // printed frame lines
  ctx.strokeStyle = finish === 'engraved' ? 'rgba(38,52,92,.75)' : 'rgba(60,48,36,.55)';
  ctx.lineWidth = Math.max(1.5, W / 320);
  if (cutter === 'oval') {
    ctx.beginPath(); ctx.ellipse(m + pw / 2, m + ph / 2, pw / 2 + ctx.lineWidth * 2, ph / 2 + ctx.lineWidth * 2, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.strokeRect(m - ctx.lineWidth * 2, m - ctx.lineWidth * 2, pw + ctx.lineWidth * 4, ph + ctx.lineWidth * 4);
  }

  // type: maker's name small at the top corner, caption along the bottom
  const ink = finish === 'engraved' ? '#26345C' : '#3C3024';
  ctx.fillStyle = ink; ctx.textBaseline = 'middle';
  try { await document.fonts.load(`${Math.round(m * 0.95)}px "Mrs Saint Delafield"`); } catch { /* falls back below */ }
  ctx.font = `${Math.round(m * 0.95)}px "Mrs Saint Delafield", "Snell Roundhand", cursive`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Signed', m - 2, m * 0.78);
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(m * 0.34)}px Newsreader, Georgia, serif`;
  ctx.textAlign = 'right';
  ctx.fillText(maker.toUpperCase().slice(0, 18), W - m, m * 0.55);
  if (caption) {
    ctx.textAlign = 'center';
    ctx.font = `italic ${Math.round(m * 0.52)}px Newsreader, Georgia, serif`;
    ctx.fillText(caption.slice(0, 40), W / 2, m + ph + m * 0.25 + capH / 2, W - m * 2);
  }

  // perforations: punch evenly spaced holes along every edge
  ctx.globalCompositeOperation = 'destination-out';
  const r = m * 0.24;
  const holes = (len: number) => Math.max(4, Math.round(len / (r * 3.1)));
  const punch = (x: number, y: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const nx = holes(W), ny = holes(H);
  for (let i = 0; i <= nx; i++) { const x = (W * i) / nx; punch(x, 0); punch(x, H); }
  for (let i = 0; i <= ny; i++) { const y = (H * i) / ny; punch(0, y); punch(W, y); }
  ctx.globalCompositeOperation = 'source-over';

  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not cut the stamp.'))), 'image/png'));
}

/** Read a picked photo file into an image element. */
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('That photo could not be read.'));
    i.src = url;
  });
}
