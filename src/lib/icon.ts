import type { Profile } from './types';

const imgCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    }));
  }
  return imgCache.get(src)!;
}

/** Draws the person's own seal (wax + pressed letters) as a square PNG. */
async function drawSeal(p: Pick<Profile, 'wax' | 'monogram' | 'name'>, size: number, background: string | null): Promise<string> {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, size, size); }
  const wax = await loadImage(`/assets/wax-${p.wax}.png`);
  const inset = background ? size * 0.08 : 0;
  ctx.drawImage(wax, inset, inset, size - inset * 2, size - inset * 2);

  const mono = (p.monogram || p.name.slice(0, 1) || '').toUpperCase();
  if (mono) {
    const fontSize = (size - inset * 2) * (mono.length > 1 ? 0.24 : 0.32);
    const font = `italic 600 ${fontSize}px Newsreader, Georgia, serif`;
    try { await document.fonts.load(font); } catch { /* fall back to Georgia */ }
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = size / 2, y = size / 2 - size * 0.01;
    // Pressed into the wax: a light edge below, a dark letter on top.
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillText(mono, x, y + Math.max(1, size * 0.006));
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.fillText(mono, x, y);
  }
  return c.toDataURL('image/png');
}

function setLink(rel: string, href: string, extra: Record<string, string> = {}) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
  for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
}

let lastKey = '';
let lastManifest: string | null = null;

/** Makes the browser tab icon and the Home Screen icon the person's own seal. */
export async function applySealIcon(p: Pick<Profile, 'wax' | 'monogram' | 'name'>) {
  const key = `${p.wax}|${p.monogram}|${p.name.slice(0, 1)}`;
  if (key === lastKey) return;
  lastKey = key;
  const paper = '#F4EFE6';
  const [fav, touch, i192, i512] = await Promise.all([
    drawSeal(p, 64, null),
    drawSeal(p, 180, paper),
    drawSeal(p, 192, paper),
    drawSeal(p, 512, paper)
  ]);
  setLink('icon', fav, { type: 'image/png' });
  setLink('apple-touch-icon', touch);

  const manifest = {
    name: 'Signed', short_name: 'Signed', description: 'Letters between friends, carried by owls.',
    start_url: `${location.origin}/`, scope: `${location.origin}/`, display: 'standalone',
    theme_color: paper, background_color: paper,
    icons: [
      { src: i192, sizes: '192x192', type: 'image/png' },
      { src: i512, sizes: '512x512', type: 'image/png' },
      { src: i512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
  if (lastManifest) URL.revokeObjectURL(lastManifest);
  lastManifest = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
  setLink('manifest', lastManifest);
}
