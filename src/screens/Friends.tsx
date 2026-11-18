import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { timeLeft } from '../lib/format';
import { Icon, Nav, Owl, Seal } from '../components/bits';
import { rankOf } from '../lib/owl';
import { useFlights } from '../components/InTheAir';
import type { Plume, Profile } from '../lib/types';

/* The sorting shelf: one pigeonhole per friend. An owl sits on its peg unless it is in the air. */

// Dropped feathers take the colour of the owl that left them: [dark, mid, light, bars].
const PLUME: Record<Plume, [string, string, string, string]> = {
  tawny: ['#6C5239', '#836447', '#B58F6C', '#413122'],
  ash: ['#605E59', '#74726C', '#A3A199', '#3A3935'],
  umber: ['#493729', '#584434', '#826753', '#2B2118'],
  sand: ['#877557', '#A38D6A', '#DEC397', '#524735'],
  white: ['#9D9A93', '#BCB9B1', '#FDF9EE', '#5F5E59'],
  dark: ['#2A2522', '#342F2C', '#534D49', '#181514'],
  russet: ['#683C27', '#7E4A30', '#B16F4E', '#3E2417'],
  slate: ['#43494F', '#525961', '#79818B', '#282B30']
};

const PAPER = ['#D9CCB2', '#EADFCB', '#CFC1A5', '#F0E7D6', '#DDD0B7', '#E6DAC3', '#C9BB9F', '#EEE4D0', '#D5C7AC'];
const LIE: [number, number][] = [[0, 58], [3, 56], [1, 60], [4, 54], [0, 57], [2, 58], [5, 55], [1, 59], [3, 56]];

/** Is it night where this friend is? Their owl gets a candle. */
function nightAt(tz: string): boolean {
  try {
    const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: tz }).format(new Date())) % 24;
    return h >= 20 || h < 6;
  } catch { return false; }
}

/** Letters lying flat, tied with ribbon. One sheet per letter, up to nine. */
function Stack({ n, under }: { n: number; under: boolean }) {
  return (
    <span className={`sh-stack${under ? ' under' : ''}`} aria-hidden="true">
      {LIE.slice(0, n).map(([off, w], k) => <i key={k} style={{ width: `calc(var(--u) * ${w})`, marginInlineStart: `calc(var(--u) * ${off})`, background: PAPER[k] }} />)}
      <b /><u />
      <svg viewBox="0 0 46 24"><path d="M23 14C14 2 3 3 4 11c1 7 12 6 19 3ZM23 14c9-12 20-11 19-3c-1 7-12 6-19 3Z" fill="none" stroke="#8E2C27" strokeWidth="2.4" strokeLinejoin="round" /><path d="M23 14l-6 9M23 14l7 9" stroke="#8E2C27" strokeWidth="2.2" strokeLinecap="round" /><circle cx="23" cy="14" r="3" fill="#6E201C" /></svg>
    </span>
  );
}

const VANE = 'M22 27.5C34 12 62 3 96 3C106 3 113 6 116 10C108 18 92 25 70 29C52 32 34 33 22 27.5Z';
function Feather({ id, plume, className = 'sh-feather' }: { id: string; plume: Plume; className?: string }) {
  const [dark, mid, light, bars] = PLUME[plume] ?? PLUME.tawny;
  return (
    <svg className={className} viewBox="0 0 120 40" aria-hidden="true">
      <defs>
        <linearGradient id={`fg-${id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={dark} /><stop offset=".55" stopColor={mid} /><stop offset="1" stopColor={light} /></linearGradient>
        <clipPath id={`fc-${id}`}><path d={VANE} /></clipPath>
      </defs>
      <path d="M3 31C10 30 16 29 23 27.5" stroke="#EADBB8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d={VANE} fill={`url(#fg-${id})`} />
      <g clipPath={`url(#fc-${id})`}>
        <path d="M42 0L52 40M64 0L74 40M86 0L96 40" stroke={bars} strokeWidth="7" opacity=".42" />
        <path d="M40 24.2L48 10M50 22.2L59 7.5M60 20.2L70 5.5M70 18.2L80 4.5M80 16.2L90 4M90 14.3L100 4.5M100 12.5L108 6M40 24.2L50 32M50 22.2L61 30.5M60 20.2L72 28.5M70 18.2L83 26M80 16.2L93 22.5M90 14.3L102 19M100 12.5L110 15M35 25.2L42 14M45 23.2L53 9M55 21.2L64 6.5M65 19.2L75 5M75 17.2L85 4M85 15.2L95 4M95 13.4L104 5M45 23.2L55 31.5M55 21.2L66 29.5M65 19.2L77 27.5M75 17.2L88 24.5M85 15.2L98 21M95 13.4L106 17" stroke={bars} strokeWidth=".6" opacity=".45" fill="none" />
      </g>
      <path d="M57 6.5L61 18.5M83 3.5L85 15M47 32L50 23.5" stroke="#160E08" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M23 27.5C50 22 85 15 116 10" stroke="#F3E6C8" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M22 27q-3-6 2-9M24 28q-6 2-4 7M27 26q-1-6 5-7" stroke="#E9DBC0" strokeWidth=".9" fill="none" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

function Candle({ id }: { id: string }) {
  return (
    <>
      <span className="sh-halo" aria-hidden="true" />
      <svg className="sh-candle" viewBox="0 -16 40 80" aria-hidden="true">
        <defs>
          <linearGradient id={`cw-${id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#A9966F" /><stop offset=".38" stopColor="#F1E4C4" /><stop offset=".7" stopColor="#CDBB95" /><stop offset="1" stopColor="#7F6E4E" /></linearGradient>
          <linearGradient id={`ch-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFD68A" stopOpacity=".85" /><stop offset=".5" stopColor="#FFD68A" stopOpacity="0" /></linearGradient>
          <radialGradient id={`cf-${id}`} cx=".5" cy=".68" r=".6"><stop offset="0" stopColor="#FFFCEC" /><stop offset=".42" stopColor="#FFE28E" /><stop offset=".85" stopColor="#F59A2E" /><stop offset="1" stopColor="#F59A2E" stopOpacity=".5" /></radialGradient>
          <linearGradient id={`cd-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E3C782" /><stop offset="1" stopColor="#5E4A20" /></linearGradient>
        </defs>
        <ellipse cx="20" cy="59" rx="18" ry="4" fill="#000" opacity=".55" />
        <ellipse cx="20" cy="56.5" rx="16" ry="4.5" fill={`url(#cd-${id})`} />
        <ellipse cx="20" cy="55.5" rx="13" ry="3" fill="#8F7234" />
        <path d="M14 15v40a6 2 0 0 0 12 0V15Z" fill={`url(#cw-${id})`} />
        <path d="M14 15v40a6 2 0 0 0 12 0V15Z" fill={`url(#ch-${id})`} />
        <path d="M14.2 17c-.8 5-.5 9 .3 12.5c1-2.500 1.200-7 .9-12.500Z" fill="#F4E8CB" />
        <ellipse cx="20" cy="15" rx="6" ry="2" fill="#FFF3D4" />
        <path d="M20 15v-4.500" stroke="#2A1A10" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M20 -7C24.800 -.5 25.500 5.500 20 11C14.500 5.500 15.200 -.5 20 -7Z" fill={`url(#cf-${id})`} />
        <ellipse cx="20" cy="9.300" rx="2" ry="1.300" fill="#5A78DC" opacity=".45" />
      </svg>
      <span className="sh-glow" aria-hidden="true" />
    </>
  );
}

function Walls() {
  return <><span className="sh-back" /><span className="sh-lw" /><span className="sh-rw" /><span className="sh-floor" /></>;
}

/** Each owl stands on its rank perch: twig, wood, silver caps, gold caps, solid gold.
 *  In a pigeonhole it's a peg fixed to the side wall; on top of the shelf it stands on two feet.
 *  [height, top of the rod], both as a share of the picture's width. */
const PEG: Record<string, [number, number]> = {
  'wall-new': [0.6603, 0.3587], 'wall-courier': [0.462, 0.1551], 'wall-senior': [0.4606, 0.1577], 'wall-veteran': [0.4635, 0.1587], 'wall-master': [0.4665, 0.1629],
  'stand-new': [0.7156, 0.3211], 'stand-courier': [0.4141, 0.0184], 'stand-senior': [0.4232, 0.0219], 'stand-veteran': [0.4193, 0.0217], 'stand-master': [0.4098, 0.0183]
};
function RankPerch({ km, where }: { km?: number; where: 'hole' | 'top' }) {
  const r = rankOf(km).id;
  const key = `${where === 'hole' ? 'wall' : 'stand'}-${r}`;
  const [h, top] = PEG[key];
  const below = h - top;                       // how much of the picture sits under the top of the rod, per unit of width
  const style = where === 'hole'
    ? { width: 'calc(var(--u) * 86)', bottom: `calc(var(--u) * ${(48 - below * 86).toFixed(2)})` }
    : { width: 'calc(var(--u) * 86)', bottom: 0 };
  return <img className={`sh-rank sh-rank-${where}`} src={`/owls/peg-${key}.webp`} alt="" draggable={false} style={style} />;
}
/** Where the owl's feet go on top of the shelf: the top of its standing perch's rod, in the pigeonholes' --u. */
const topRod = (km?: number) => { const [h, t] = PEG[`stand-${rankOf(km).id}`]; return (h - t) * 86; };

export default function Friends() {
  const { me, friends, letters, say, session } = useStore();
  const [invite, setInvite] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  const flights = useFlights();
  if (!me) return null;
  const uid = session!.user.id;
  const now = Date.now();

  async function makeInvite() {
    const { data, error } = await supabase.from('invites').insert({ from_user: uid }).select('code').single();
    if (error || !data) { say('Could not make an invite. Try again.'); return; }
    const link = `${window.location.origin}/#/invite/${data.code}`;
    setInvite(link);
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try { await nav.share({ title: 'Write to me on Signed', text: `${me!.name} wants to write you letters.`, url: link }); } catch { /* the person closed the share sheet */ }
    }
  }

  // My own owl leaves its perch whenever one of my letters is in the air. The tag names the next to land.
  const outs = flights.filter((f) => f.out).sort((a, b) => new Date(a.arrive_at).getTime() - new Date(b.arrive_at).getTime());
  const mine = outs[0];
  const mineTo = mine ? friends.find((f) => f.profile.id === mine.friendId)?.profile.name || 'a friend' : '';
  const tagWho = outs.length > 1 ? `${mineTo} +${outs.length - 1}` : `To ${mineTo}`;
  const coming = flights.filter((f) => !f.out);
  let line = friends.length ? 'Every owl is home.' : 'No one to write to yet.';
  if (coming.length === 1) line = 'One owl is on its way to you.';
  else if (coming.length > 1) line = `${coming.length} owls are on their way to you.`;

  type Slot = { kind: 'friend'; f: Profile } | { kind: 'invite' } | { kind: 'bare' };
  const slots: Slot[] = [...friends.map(({ profile }) => ({ kind: 'friend' as const, f: profile })), { kind: 'invite' }];
  if (slots.length % 2) slots.push({ kind: 'bare' });
  const rows: Slot[][] = [];
  for (let i = 0; i < slots.length; i += 2) rows.push(slots.slice(i, i + 2));

  function hole(s: Slot, i: number) {
    const flip = i % 2 === 1;
    if (s.kind === 'bare') return <div key="bare" className={`sh-hole${flip ? ' flip' : ''}`} aria-hidden="true"><span className="sh-in"><Walls /><span className="sh-peg" /><span className="sh-shade" /></span></div>;
    if (s.kind === 'invite') {
      return (
        <div key="invite" className={`sh-hole${flip ? ' flip' : ''}`}>
          <button className="sh-in" onClick={makeInvite} aria-label="An empty pigeonhole. Invite a friend."><Walls /><span className="sh-peg" /><span className="sh-shade" /></button>
        </div>
      );
    }
    const f = s.f;
    const flight = coming.find((x) => x.friendId === f.id);
    const away = Boolean(flight);
    const waiting = letters.some((l) => l.sender === f.id && l.recipient === uid && !l.opened_at && new Date(l.arrive_at).getTime() <= now);
    const count = letters.filter((l) => (l.sender === f.id || l.recipient === f.id) && new Date(l.arrive_at).getTime() <= now).length;
    const night = nightAt(f.tz);
    const onFloor = away ? 'feather' : waiting ? 'letter' : null;   // what lies under the peg
    const showStack = count > 0 && !(night && onFloor);
    const name = f.name || 'A friend';
    let label = `${name}. ${f.owl_name} is home.`;
    if (away) label = `${name}. ${f.owl_name} is out flying and reaches you in ${timeLeft(flight!.arrive_at)}.`;
    else if (waiting) label = `${name}. ${f.owl_name} brought a letter you have not opened.`;
    if (night) label += ' It is night where they are.';
    const shade = <span className="sh-shade" />;
    return (
      <div key={f.id} className={`sh-hole${flip ? ' flip' : ''}${night ? ' night' : ''}`}>
        <button className="sh-in" onClick={() => go(`friend/${f.id}`)} aria-label={label}>
          <Walls />
          {night && <><span className="sh-dusk" /><span className="sh-warm" />{shade}</>}
          <RankPerch km={f.flown_km} where="hole" />
          {showStack && <Stack n={Math.min(9, count)} under={night} />}
          {!away && <><span className="sh-contact" aria-hidden="true" /><Owl p={f} className="sh-owl" /></>}
          {onFloor === 'feather' && <Feather id={f.id} plume={f.plume} />}
          {!night && shade}
          {onFloor === 'letter' && <span className="sh-letter" aria-hidden="true"><Seal p={f} size={22} /></span>}
          {away && (
            <>
              <span className="sh-string" aria-hidden="true" />
              <span className="sh-tag" aria-hidden="true"><i /><b>Out flying</b><small>lands in {timeLeft(flight!.arrive_at)}</small></span>
            </>
          )}
          {night && <Candle id={f.id} />}
        </button>
      </div>
    );
  }

  return (
    <main className="app">
      <div className="sh-top">
        <h1>Friends</h1>
        <p className="small muted" style={{ fontStyle: 'italic' }}>{line}</p>
        <div className="sh-perch">
          <RankPerch km={me.flown_km} where="top" />
          {mine ? (
            <>
              <Feather id="mine" plume={me.plume} className="sh-perch-feather" />
              <span className="sh-perch-string" aria-hidden="true" />
              <span className="sh-perch-tag" role="img" aria-label={`${me.owl_name} is out delivering to ${outs.length > 1 ? `${mineTo} and ${outs.length - 1} more` : mineTo}. The next letter lands in ${timeLeft(mine.arrive_at)}.`}>
                <i /><b>{tagWho}</b><small>{timeLeft(mine.arrive_at)}</small>
              </span>
            </>
          ) : (<>
            <span className="sh-contact top" aria-hidden="true" style={{ bottom: `calc(var(--u) * ${(topRod(me.flown_km) - 4).toFixed(2)})` }} />
            <Owl p={me} className="sh-perch-owl" style={{ bottom: `calc(var(--u) * ${(topRod(me.flown_km) - 11).toFixed(2)})` }} alt={`${me.owl_name}, your owl, on its perch on top of the shelf`} />
          </>)}
        </div>
      </div>
      <div className="shelf">
        <div className="sh-lid" aria-hidden="true" />
        <div className="sh-plank crown" />
        {rows.map((row, r) => (
          <div key={r}>
            <div className="sh-row">{row.map((s, c) => hole(s, r * 2 + c))}</div>
            <div className="sh-plank">
              {row.map((s, c) => {
                if (s.kind === 'bare') return <span key={c} className="sh-half" />;
                if (s.kind === 'invite') return <span key={c} className="sh-half"><button className="sh-label blank" onClick={makeInvite}>+ Invite a friend</button></span>;
                const unread = letters.some((l) => l.sender === s.f.id && l.recipient === uid && !l.opened_at && new Date(l.arrive_at).getTime() <= now);
                return (
                  <span key={c} className="sh-half" aria-hidden="true">
                    <span className="sh-seal"><Seal p={s.f} size={22} /></span>
                    <span className="sh-label">{s.f.name || 'A friend'}{unread && <i className="sh-dot" />}</span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {friends.length === 0 && <p className="small muted center">Send an invite link. Once your friend opens it and signs in, their owl moves in.</p>}
      {invite && (
        <div className="card stack" style={{ padding: 14, position: 'relative' }}>
          <button className="scrap-x" style={{ top: 8, right: 8 }} onClick={() => setInvite(null)} aria-label="Close invite">{Icon.close}</button>
          <span className="small muted" style={{ paddingRight: 36 }}>Send this link to your friend. It works once.</span>
          <input type="text" readOnly value={invite} onFocus={(e) => e.target.select()} aria-label="Invite link" />
          <button className="chip" onClick={async () => {
            try { await navigator.clipboard.writeText(invite); say('Link copied.'); } catch { say('Select the link and copy it.'); }
          }}>Copy link</button>
        </div>
      )}
      <Nav on="friends" />
    </main>
  );
}
