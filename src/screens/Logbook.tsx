import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { ACHIEVEMENTS, localStats, markStampsSeen, useSealStats, useStampRows, type Achievement, type SealStats, type StampRow } from '../lib/achievements';
import { RANKS, breedName, pieceOf, rankIndex, speedPct, type Outfit } from '../lib/owl';
import { HEIRLOOM_DAYS, Icon, Owl, PATINA, Seal, patinaStage, sealAgeDays } from '../components/bits';
import { AchievementSheet, mixName } from '../components/Achievements';
import { InkDefs, OWL_INK, SEAL_INK, StampArt, StampBlank } from '../components/StampArt';
import type { Profile } from '../lib/types';

type Who = Profile & { sealed: number; flown_km: number };
const ROT = [-8, 6, -3, 10, -11, 4, -5, 8, -2];
const ink = (a: Achievement) => (a.kind === 'seal' ? SEAL_INK : OWL_INK);
const frac = (a: Achievement, s: SealStats) => { const pr = a.progress?.(s); return pr ? Math.min(1, pr[0] / pr[1]) : 0; };
const fmt = (a: Achievement, n: number) => `${n.toLocaleString('en-GB')}${a.unit ?? ''}`;
const progressText = (a: Achievement, s: SealStats) => { const pr = a.progress?.(s); return pr ? `${fmt(a, pr[0])} of ${fmt(a, pr[1])}` : 'Not yet'; };
const rewardWords = (a: Achievement) => (!a.reward ? '' : a.kind === 'owl' ? (pieceOf(a.reward)?.name ?? a.reward) : mixName(a.reward).replace(/^./, (c) => c.toUpperCase()));
const dayMonthYear = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** What a logbook shows: who, their numbers, and which stamps are in. */
function useLog(stats: SealStats | null, rows: StampRow[]) {
  return useMemo(() => {
    if (!stats) return null;
    const when = new Map(rows.map((r) => [r.achievement, r]));
    const done = ACHIEVEMENTS.filter((a) => a.done(stats))
      .sort((x, y) => (when.get(x.id)?.earned_at ?? '9').localeCompare(when.get(y.id)?.earned_at ?? '9'));
    const todo = ACHIEVEMENTS.filter((a) => !a.done(stats));
    const next = [...todo].filter((a) => a.progress).sort((x, y) => frac(y, stats) - frac(x, stats))[0];
    return { when, done, todo, next };
  }, [stats, rows]);
}

/** The next stamp: a blank dotted circle with an ink ring showing how close it is. */
function Ring({ a, s, size }: { a: Achievement; s: SealStats; size: number }) {
  const C = 2 * Math.PI * 46, f = frac(a, s), pr = a.progress?.(s);
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" width={size} height={size} style={{ overflow: 'visible', flex: 'none' }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#8E8375" strokeWidth="1.5" strokeDasharray="1 4.2" strokeLinecap="round" />
      <circle cx="50" cy="50" r="46" fill="none" stroke={ink(a)} strokeWidth="3.2" strokeLinecap="round" strokeDasharray={`${(C * f).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 50 50)" filter="url(#ink-rough)" />
      {pr && <text x="50" y="58" textAnchor="middle" fontFamily="Newsreader, Georgia, serif" fontSize={22} fontWeight={600} fill={ink(a)}>
        {pr[1] >= 1000 ? `${Math.round(f * 100)}%` : `${pr[0]}/${pr[1]}`}</text>}
    </svg>
  );
}

function SealPanel({ p, s }: { p: Who; s: SealStats }) {
  const since = s.seal_since ?? p.created_at;
  const st = patinaStage(s.sealed, since);
  const last = PATINA.length - 1;
  const waiting = st === last - 1 && s.sealed >= PATINA[last].at;
  const next = PATINA[st + 1];
  const f = waiting ? Math.min(1, sealAgeDays(since) / HEIRLOOM_DAYS) : next ? (s.sealed - PATINA[st].at) / (next.at - PATINA[st].at) : 0;
  const left = waiting ? Math.max(1, Math.ceil(HEIRLOOM_DAYS - sealAgeDays(since))) : 0;
  return (
    <section className="log-panel" style={{ color: SEAL_INK, transform: 'rotate(-1.2deg)' }} aria-label={`Seal patina: ${PATINA[st].name}`}>
      <span className="log-frame" />
      <div className="row" style={{ gap: 12 }}>
        <Seal p={{ ...p, sealed: s.sealed, created_at: since }} size={58} />
        <span className="log-panel-title">
          <span className="log-kicker">SEAL · PATINA</span>
          <b>{PATINA[st].name.toUpperCase()}</b>
          <span className="log-note">{PATINA[st].note}</span>
        </span>
      </div>
      <div className="log-line" style={{ ['--y' as string]: '15px' }}>
        <i className="log-dash" /><i className="log-fill" style={{ width: `${(20 * st + 20 * f)}%` }} />
        <div className="log-steps">
          {PATINA.map((x, i) => (
            <div key={x.name} className={`log-step${i === st ? ' now' : ''}${i > st ? ' later' : ''}`}>
              <span className="log-dot"><Seal p={{ ...p, sealed: s.sealed }} stage={i} size={28} /></span>
              <span>{x.name}</span>
              <small>{i === last ? `${x.at} + 1 yr` : x.at}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="log-foot"><span>{s.sealed.toLocaleString('en-GB')} sealed</span>
        <span>{waiting ? `${PATINA[last].name} in ${left} day${left === 1 ? '' : 's'}` : next ? `${next.at - s.sealed} more to ${next.name}` : 'Fully aged'}</span></div>
    </section>
  );
}

function OwlPanel({ p }: { p: Who }) {
  const km = p.flown_km;
  const r = rankIndex(km);
  const next = RANKS[r + 1];
  const f = next ? (km - RANKS[r].at) / (next.at - RANKS[r].at) : 0;
  const owl = p.owl_name || 'Your owl';
  return (
    <section className="log-panel" style={{ color: OWL_INK, transform: 'rotate(0.9deg)' }} aria-label={`Owl seniority: ${RANKS[r].name}`}>
      <span className="log-frame" />
      <div className="row" style={{ gap: 12 }}>
        <Owl p={p} perch width={54} />
        <span className="log-panel-title">
          <span className="log-kicker">OWL · SENIORITY</span>
          <b>{RANKS[r].short.toUpperCase()}</b>
          <span className="log-note">{owl} · {breedName(p.breed)}{RANKS[r].speed > 1 ? ` · flies ${speedPct(RANKS[r].speed)} faster` : ''}</span>
        </span>
      </div>
      <div className="log-line" style={{ ['--y' as string]: '35px' }}>
        <i className="log-dash" /><i className="log-fill" style={{ width: `${(20 * r + 20 * f)}%` }} />
        <div className="log-steps">
          {RANKS.map((x, i) => (
            <div key={x.id} className={`log-step${i === r ? ' now' : ''}${i > r ? ' later' : ''}`}>
              <span className="log-owl">{i === r && <Owl p={{ breed: p.breed }} width={20} />}</span>
              <span className="log-perch"><img src={`/owls/perch-${x.id}.webp`} alt="" /></span>
              <span>{x.short}</span>
              <small>{x.at ? `${x.at / 1000}k km` : '0 km'}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="log-foot"><span>{km.toLocaleString('en-GB')} km flown</span>
        <span>{next ? `${(next.at - km).toLocaleString('en-GB')} km to ${next.short}` : 'Top rank'}</span></div>
    </section>
  );
}

/** The moment a new stamp goes in: the page dims, a rubber stamp comes down, thump, and the design is revealed. */
function StampingMoment({ a, date, p, onClose }: { a: Achievement; date?: string; p: Who; onClose: (then?: string) => void }) {
  const [run, setRun] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => { try { navigator.vibrate?.(35); } catch { /* not supported */ } }, 1560);
    return () => window.clearTimeout(t);
  }, [run]);
  const piece = a.kind === 'owl' ? pieceOf(a.reward) : undefined;
  const preview: Outfit = piece ? { [piece.slot]: piece.id } : {};
  return createPortal(
    <div className="moment" role="dialog" aria-label={`New stamp: ${a.title}`}>
      <div className="moment-dim" />
      <div className="moment-card" key={run}>
        <div className="m-intro">
          <span className="log-kicker" style={{ color: SEAL_INK }}>A NEW STAMP</span>
          <span className="m-sig">for your log</span>
        </div>
        <div className="m-slot">
          <span className="m-blank"><StampBlank id={a.id} size={150} /></span>
          <span className="m-ripple" style={{ borderColor: ink(a) }} />
          <span className="m-ink"><StampArt id={a.id} color={ink(a)} date={date} size={150} uid="-m" /></span>
          <div className="m-tool" aria-hidden="true"><i className="m-knob" /><i className="m-neck" /><i className="m-base" /><i className="m-rubber" /></div>
        </div>
        <div className="m-after">
          <b style={{ fontSize: 24 }}>{a.title}</b>
          <span className="muted" style={{ lineHeight: 1.35 }}>{a.desc}</span>
        </div>
        {a.reward && (
          <div className="m-after2 m-reward">
            <span className="reward-pic">{piece ? <Owl p={p} outfit={preview} width={56} /> : <Seal p={{ ...p, mixins: [a.reward] }} size={52} />}</span>
            <span className="grow stack" style={{ gap: 2 }}>
              <span className="log-kicker" style={{ color: SEAL_INK }}>UNLOCKED</span>
              <b style={{ fontSize: 17 }}>{rewardWords(a)}</b>
              <span className="small muted">{piece ? `Ready for ${p.owl_name || 'your owl'} to wear.` : 'Ready to press into your wax seal.'}</span>
            </span>
          </div>
        )}
        <div className="m-after2 foot" style={{ width: '100%', marginTop: 16 }}>
          <button className="btn" onClick={() => onClose()}>See my log</button>
          {a.reward && <button className="btn wax" onClick={() => onClose(piece ? 'dress' : 'setup/seal')}>{piece ? 'Try it on' : 'Press it in'}</button>}
        </div>
      </div>
      <button className="m-replay" onClick={() => setRun((n) => n + 1)}>Replay the stamp</button>
    </div>,
    document.body
  );
}

/** Your courier's log, or a friend's: seal patina, owl seniority, the next stamp, the stamps in, and the blanks still to come. */
export default function Logbook({ id }: { id?: string }) {
  const { me, friend, friends, letters, session } = useStore();
  const uid = session?.user.id;
  const own = !id || id === uid;
  const target = own ? uid : id;
  const stats = useSealStats(target, own && uid ? localStats(uid, letters, friends) : undefined);
  const [rows, reload] = useStampRows(target);
  const log = useLog(stats, rows);
  const [open, setOpen] = useState<Achievement | null>(null);
  const [shown, setShown] = useState<string[]>([]);
  const base = own ? me : friend(id!)?.profile;
  if (!base) return <main className="app"><p className="muted">Loading…</p></main>;
  const p: Who = { ...base, sealed: stats?.sealed ?? base.sealed ?? 0, flown_km: Math.max(base.flown_km ?? 0, Math.round(stats?.km ?? 0)) };
  // Stamps you've earned but not yet watched go in one at a time, as soon as the log opens.
  const queue = own && log ? log.done.filter((a) => log.when.get(a.id) && !log.when.get(a.id)!.seen_at && !shown.includes(a.id)) : [];
  const now = queue[0];
  const since = stats?.seal_since ?? base.created_at;

  return (
    <main className="app">
      <InkDefs />
      <div className="top">
        <button className="icon" onClick={() => go(own ? 'profile' : `friend/${id}`)} aria-label="Back">{Icon.back}</button>
        <h1 className="grow">{own ? 'Logbook' : `${base.name}’s logbook`}</h1>
      </div>
      <section className="logbook" aria-label={`${base.name}’s courier log`}>
        <div className="log-head">
          <span className="log-kicker" style={{ color: SEAL_INK, letterSpacing: '.32em' }}>SIGNED · COURIER’S LOG</span>
          <span className="log-name">{base.name}</span>
          {since && <span className="log-since"><i />kept since {dayMonthYear(since)}<i /></span>}
          <span className="log-totals">
            <span><b>{p.sealed.toLocaleString('en-GB')}</b> letters</span>
            <span><b>{p.flown_km.toLocaleString('en-GB')}</b> km</span>
            {log && <span><b>{log.done.length}</b> of {ACHIEVEMENTS.length} stamps</span>}
          </span>
        </div>

        {stats ? <>
          <SealPanel p={p} s={stats} />
          <OwlPanel p={p} />

          {log?.next && (
            <div className="stack" style={{ gap: 10 }}>
              <h3 className="log-sec">NEXT STAMP</h3>
              <button className="log-next" onClick={() => setOpen(log.next)}>
                <Ring a={log.next} s={stats} size={88} />
                <span className="grow stack" style={{ gap: 3 }}>
                  <b style={{ fontSize: 19 }}>{log.next.title}</b>
                  <span className="small muted" style={{ lineHeight: 1.35 }}>{log.next.desc} {progressText(log.next, stats)} so far.</span>
                  {log.next.reward && <span className="small" style={{ color: SEAL_INK }}>Unlocks {rewardWords(log.next).toLowerCase()}</span>}
                </span>
              </button>
            </div>
          )}

          {log && log.done.length > 0 && (
            <div className="stack" style={{ gap: 8 }}>
              <h3 className="log-sec">STAMPED · {log.done.length}</h3>
              <div className="log-grid">
                {log.done.map((a, i) => (
                  <button key={a.id} className="log-stamp" onClick={() => setOpen(a)} aria-label={`${a.title}, stamped${a.reward ? `, unlocked ${rewardWords(a).toLowerCase()}` : ''}`}>
                    <span style={{ opacity: i % 3 === 1 ? 0.82 : 0.93 }}>
                      {now?.id === a.id ? <StampBlank id={a.id} size={92} /> : <StampArt id={a.id} color={ink(a)} date={log.when.get(a.id)?.earned_at} size={92} rotate={ROT[i % ROT.length]} />}
                    </span>
                    <span className="log-under">{a.reward ? `unlocked ${rewardWords(a).toLowerCase()}` : 'where it began'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {log && log.todo.filter((a) => a !== log.next).length > 0 && (
            <div className="stack" style={{ gap: 10 }}>
              <h3 className="log-sec">STILL TO STAMP · {log.todo.length - (log.next ? 1 : 0)} MORE</h3>
              <div className="log-grid">
                {log.todo.filter((a) => a !== log.next).map((a) => (
                  <button key={a.id} className="log-stamp todo" onClick={() => setOpen(a)} aria-label={`${a.title}, ${progressText(a, stats)}${a.reward ? `, unlocks ${rewardWords(a).toLowerCase()}` : ''}`}>
                    <StampBlank id={a.id} size={80} />
                    <i className="log-bar"><i style={{ width: `${Math.round(frac(a, stats) * 100)}%`, background: ink(a) }} /></i>
                    <span className="log-todo-name">{a.title}</span>
                    <span className="log-under">{progressText(a, stats)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="log-legend">
            <span><i style={{ borderColor: SEAL_INK }} />Seal: a mix-in for your wax</span>
            <span><i style={{ borderColor: OWL_INK }} />Owl: something to wear</span>
          </div>
        </> : <p className="small muted">{own ? 'Opening your logbook…' : `Couldn’t load ${base.name}’s logbook just now. Try again in a moment.`}</p>}
      </section>

      {open && stats && createPortal(<AchievementSheet a={open} stats={stats} p={p} mine={own} date={log?.when.get(open.id)?.earned_at} onClose={() => setOpen(null)} />, document.body)}
      {now && uid && (
        <StampingMoment key={now.id} a={now} date={log?.when.get(now.id)?.earned_at} p={p} onClose={(then) => {
          setShown((s) => [...s, now.id]);
          void markStampsSeen(uid, [now.id]).then(reload);
          if (then) go(then);
        }} />
      )}
    </main>
  );
}

/** The logbook on the Profile page: the latest stamps, the next one, and a way in. */
export function LogbookCard({ stats, rows, unseen }: { stats: SealStats; rows: StampRow[]; unseen: number }) {
  const when = new Map(rows.map((r) => [r.achievement, r.earned_at]));
  const done = ACHIEVEMENTS.filter((a) => a.done(stats));
  const latest = [...done].sort((x, y) => (when.get(y.id) ?? '').localeCompare(when.get(x.id) ?? '')).slice(0, 6).reverse();
  const next = ACHIEVEMENTS.filter((a) => !a.done(stats) && a.progress).sort((x, y) => frac(y, stats) - frac(x, stats))[0];
  const ys = [2, 16, 0, 14, 4, 16];
  return (
    <button className="logbook log-card" onClick={() => go('logbook')} aria-label={`Open your logbook: ${done.length} of ${ACHIEVEMENTS.length} stamped`}>
      <InkDefs />
      <span className="row" style={{ alignItems: 'baseline', gap: 8 }}>
        <span className="grow stack" style={{ gap: 0 }}>
          <span className="log-kicker" style={{ color: SEAL_INK, letterSpacing: '.3em' }}>COURIER’S LOG</span>
          <span className="log-card-title">Logbook</span>
        </span>
        <span className="small muted">{done.length} of {ACHIEVEMENTS.length} stamped <span aria-hidden="true" style={{ fontSize: 20, marginLeft: 2 }}>›</span></span>
      </span>
      {latest.length > 0
        ? <span className="log-fan" style={{ width: Math.min(324, 64 + (latest.length - 1) * 52) }}>
            {latest.map((a, i) => (
              <span key={a.id} style={{ left: i * 52, top: ys[i] }}>
                <StampArt id={a.id} color={ink(a)} date={when.get(a.id)} size={64} rotate={ROT[(i + 3) % ROT.length]} uid="-card" />
              </span>
            ))}
          </span>
        : <span className="small muted" style={{ display: 'block', margin: '10px 0 4px' }}>Your first letter puts the first stamp in.</span>}
      {unseen > 0
        ? <span className="log-card-next"><span className="dot" /><span className="grow"><b>{unseen === 1 ? 'A new stamp is waiting.' : `${unseen} new stamps are waiting.`}</b> <span className="muted">Tap to stamp it in.</span></span></span>
        : next && <span className="log-card-next">
            <Ring a={next} s={stats} size={46} />
            <span className="grow stack" style={{ gap: 1 }}><b>Next stamp: {next.title}</b><span className="muted">{progressText(next, stats)}</span></span>
          </span>}
    </button>
  );
}
