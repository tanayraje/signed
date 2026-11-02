import { useEffect, useState, type ReactNode } from 'react';
import type { CustomStamp, Profile } from '../lib/types';
import { signedUrl } from '../lib/media';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { useStore } from '../lib/store';

/** A pressed wax seal: real wax image with the person's monogram embossed into it. */
const ON_TOP = ['gold', 'glitter', 'twigs', 'petals'];

/** Marks that can be pressed into the wax instead of letters (pre-rendered reliefs that sit on any wax). */
export const MARKS: [string, string][] = [['owl', 'Owl'], ['letter', 'Letter'], ['quill', 'Quill and ink'], ['comet', 'Comet'], ['moon', 'Moon and stars'], ['sprig', 'Forget-me-nots'], ['rose', 'Rose'], ['key', 'Key']];
const isMark = (k?: string | null) => !!k && MARKS.some(([m]) => m === k);

export function Seal({ p, size = 56, label }: { p: Pick<Profile, 'wax' | 'monogram' | 'name'> & Partial<Pick<Profile, 'mixins' | 'edge' | 'mark'>>; size?: number; label?: string }) {
  const mono = (p.monogram || p.name.slice(0, 1) || '·').toUpperCase();
  const mix = p.mixins ?? [];
  return (
    <span className="seal" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, fontSize: size * (mono.length > 1 ? 0.24 : 0.32) }}>
      {mix.includes('ribbon') && <img className="ribbon" src={`/assets/mix-ribbon-${p.wax}.png`} alt="" />}
      <img src={`/assets/wax-${p.wax}${p.edge === 'clean' ? '-clean' : ''}.png`} alt="" width={size} height={size} />
      {ON_TOP.filter((m) => mix.includes(m)).map((m) => <img key={m} src={`/assets/mix-${m}.png`} alt="" width={size} height={size} />)}
      <span className="mono">{isMark(p.mark) ? <img src={`/assets/mark-${p.mark}.png`} alt="" /> : <span>{mono}</span>}</span>
    </span>
  );
}

export const owlSrc = (p: Pick<Profile, 'plume' | 'eye'>) => `/assets/owl-${p.plume}-${p.eye}.png`;

export function Owl({ p, width = 76, alt = '' }: { p: Pick<Profile, 'plume' | 'eye'>; width?: number; alt?: string }) {
  return <img className="owl" src={owlSrc(p)} alt={alt} width={width} height={Math.round(width * 1.25)} />;
}

const STAMP_ART: Record<string, [string, string]> = {
  lotus: ['#B9852B', 'M22 38c-6-4-8-10-6-16c4 2 6 6 6 10c0-6 2-11 6-14c2 5 1 11-2 15c3-3 7-4 10-3c-2 5-7 8-14 8z'],
  peacock: ['#2C5C4E', 'M22 12a9 12 0 1 0 0.01 0M22 18a4.5 6 0 1 0 0.01 0M22 36v10'],
  monsoon: ['#2C3A68', 'M10 22c0-6 5-9 10-8c2-4 9-5 12 1c4 0 6 3 5 7zM14 28l-2 6M20 28l-2 6M26 28l-2 6M32 28l-2 6'],
  chai: ['#7A2420', 'M12 22h18v8a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7zM30 25h3a3 3 0 0 1 0 6h-3M17 18c0-3 2-3 2-6M23 18c0-3 2-3 2-6']
};
export const BUILT_IN_STAMPS = Object.keys(STAMP_ART);

export function Stamp({ id, size = 44, postmark = true }: { id: string; size?: number; postmark?: boolean }) {
  const { stamps } = useStore();
  const custom = id.startsWith('custom:') ? stamps.find((s) => `custom:${s.id}` === id) : undefined;
  if (id.startsWith('custom:')) return <CutStamp s={custom} size={size} postmark={postmark} />;
  const art = STAMP_ART[id] ?? STAMP_ART.lotus;
  return (
    <svg className="stamp" width={size} height={size * 1.23} viewBox="0 0 44 54" role="img" aria-label="Stamp">
      <rect x="1" y="1" width="42" height="52" fill="#F2E8D4" stroke="#BCA983" strokeDasharray="1.5 2.5" />
      <path d={art[1]} fill="none" stroke={art[0]} strokeWidth="1" strokeLinecap="round" />
      <rect x="5" y="5" width="34" height="44" fill="none" stroke={art[0]} strokeWidth=".7" />
    </svg>
  );
}

const SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** A stamp cut from a photo. Once it has flown it carries a postmark: where and when it was sent. */
export function CutStamp({ s, size = 44, postmark = true }: { s?: CustomStamp; size?: number; postmark?: boolean }) {
  const url = useSigned(s?.image_path ?? null);
  const aspect = s?.cutter === 'square' ? 1 : s?.cutter === 'wide' ? 1.25 : 0.8;
  const h = Math.round(size / aspect);
  const d = s?.postmark_at ? new Date(s.postmark_at) : null;
  return (
    <span className="cutstamp" style={{ width: size, height: h }} role="img" aria-label={s?.caption ? `Stamp: ${s.caption}` : 'Stamp'}>
      {url ? <img src={url} alt="" draggable={false} /> : <span className="cutstamp-blank" />}
      {postmark && d && (
        <svg className="postmark" viewBox="0 0 120 70" aria-hidden="true">
          <defs><path id={`pm-${s!.id}`} d="M14 35a22 22 0 1 1 44 0" /></defs>
          <circle cx="36" cy="35" r="25" /><circle cx="36" cy="35" r="21.5" strokeWidth="1" />
          <text fontSize="7.4" letterSpacing="1"><textPath href={`#pm-${s!.id}`} startOffset="50%" textAnchor="middle">{(s!.postmark_place || 'By owl').toUpperCase().slice(0, 16)}</textPath></text>
          <text x="36" y="38" fontSize="8.6" textAnchor="middle">{d.getDate()} {SHORT_MONTHS[d.getMonth()]}</text>
          <text x="36" y="48" fontSize="7" textAnchor="middle">{d.getFullYear()}</text>
          <path d="M64 22c6-4 12 4 18 0s12 4 18 0 12 4 18 0M64 31c6-4 12 4 18 0s12 4 18 0 12 4 18 0M64 40c6-4 12 4 18 0s12 4 18 0 12 4 18 0M64 49c6-4 12 4 18 0s12 4 18 0 12 4 18 0" fill="none" />
        </svg>
      )}
    </span>
  );
}

export function useSigned(path: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (path) void signedUrl(path).then((u) => { if (live) setUrl(u); });
    else setUrl(null);
    return () => { live = false; };
  }, [path]);
  return url;
}

export function MediaImg({ path, alt }: { path: string; alt: string }) {
  const url = useSigned(path);
  return url ? <img src={url} alt={alt} /> : <div className="photo-wait" aria-label="Loading photo" />;
}

export function Polaroid({ path, caption, tilt = 0, width = '58%' }: { path: string; caption?: string | null; tilt?: number; width?: string }) {
  return (
    <figure className="polaroid" style={{ width, transform: `rotate(${tilt}deg)` }}>
      <MediaImg path={path} alt={caption || 'Polaroid'} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export const Icon = {
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M15 5l-7 7l7 7" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="1.5" /><path d="M3 7.5l9 6l9-6" /></svg>,
  wall: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5" /><circle cx="8" cy="9" r="1.4" /><circle cx="16" cy="14" r="1.4" /></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="1.5" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>,
  stamp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 3.5h1.2a1.3 1.3 0 0 0 2.6 0h1.9a1.3 1.3 0 0 0 2.6 0h1.9a1.3 1.3 0 0 0 2.6 0H19v3.2a1.3 1.3 0 0 0 0 2.6v2.4a1.3 1.3 0 0 0 0 2.6v2.4a1.3 1.3 0 0 0 0 2.6v1.2h-1.2a1.3 1.3 0 0 0-2.6 0h-1.9a1.3 1.3 0 0 0-2.6 0H8.8a1.3 1.3 0 0 0-2.6 0H5v-1.2a1.3 1.3 0 0 0 0-2.6v-2.4a1.3 1.3 0 0 0 0-2.6V9.3a1.3 1.3 0 0 0 0-2.6Z" /><rect x="8" y="7.5" width="8" height="9" /></svg>,
  camera: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4Z" /><circle cx="12" cy="13.2" r="3.6" /></svg>,
  photos: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="1.5" /><path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5" /><circle cx="15.5" cy="9.5" r="1.4" /></svg>,
  flip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" /></svg>,
  me: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /></svg>,
  star: <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#141A2E" /></svg>,
  quill: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2B2622" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 19L17 7l2 2L7 21H5z" /><path d="M15 5l2-2l4 4l-2 2" /></svg>
};

export function Top({ title, back, children }: { title: ReactNode; back?: string; children?: ReactNode }) {
  return (
    <div className="top">
      {back && <button className="icon" onClick={() => go(back)} aria-label="Back">{Icon.back}</button>}
      <h1 className="grow" style={{ fontSize: 24 }}>{title}</h1>
      {children}
    </div>
  );
}

export function Nav({ on }: { on: 'friends' | 'wall' | 'stamps' | 'seals' | 'profile' }) {
  const items: [typeof on, string, ReactNode][] = [['wall', 'Wall', Icon.wall], ['friends', 'Friends', Icon.mail], ['stamps', 'Stamps', Icon.stamp], ['seals', 'Seals', Icon.cal], ['profile', 'Profile', Icon.me]];
  return (
    <nav className="nav" aria-label="Main">
      {items.map(([k, label, icon]) => (
        <button key={k} className={on === k ? 'on' : ''} aria-current={on === k ? 'page' : undefined} onClick={() => go(k)}>{icon}{label}</button>
      ))}
    </nav>
  );
}

/** The Signed wordmark: the name, closed with the Signed seal. */
export function Wordmark({ size = 46 }: { size?: number }) {
  const s = Math.round(size * 0.46);
  return (
    <div className="wordmark">
      <span style={{ fontSize: size }}>Signed</span>
      <img src="/assets/logo-seal.png" alt="" width={s} height={s} style={{ marginBottom: Math.round(size * 0.15) }} />
    </div>
  );
}

export async function signOut() {
  await supabase.auth.signOut();
  go('wall');
}
