import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { Profile } from '../lib/types';
import { ACHIEVEMENTS, type Achievement, type SealStats } from '../lib/achievements';
import { RANKS, pieceOf, rankIndex, speedPct, type Outfit } from '../lib/owl';
import { go } from '../lib/router';
import { HEIRLOOM_DAYS, Icon, Owl, PATINA, Seal, patinaStage, sealAgeDays } from './bits';

const MIX_NAMES: Record<string, string> = {
  feather: 'owl feather', cornflower: 'cornflower petals', babysbreath: "baby's breath", chamomile: 'chamomile',
  forgetmenot: 'forget-me-nots', lace: 'lace', marigold: 'marigold petals', bow: 'ribbon bow'
};
export const mixName = (m: string) => MIX_NAMES[m] ?? m;
/** What an achievement unlocks, in words: a mix-in for the seal or a piece for the owl. */
export const rewardName = (a: Achievement) => (!a.reward ? '' : a.kind === 'owl' ? (pieceOf(a.reward)?.name ?? a.reward).replace(/^./, (c) => c.toLowerCase()) : mixName(a.reward));

/** A stitched felt patch: red for seal achievements, navy for owl ones. Greyed until earned. */
export function Badge({ a, done, size = 42 }: { a: Achievement; done: boolean; size?: number }) {
  return <img className={`badge${done ? '' : ' off'}`} src={`/assets/badges/${a.id}.webp`} alt="" width={size} height={size} draggable={false} />;
}

type Who = Pick<Profile, 'wax' | 'monogram' | 'name' | 'mixins' | 'edge' | 'mark' | 'plume' | 'breed' | 'outfit' | 'owl_name'> & { sealed?: number; flown_km?: number; created_at?: string };

/** How far a seal has aged, with the five stages and a bar to the next one. */
function PatinaSteps({ p, who }: { p: Who; who?: string }) {
  const sealed = p.sealed ?? 0;
  const st = patinaStage(sealed, p.created_at);
  const last = PATINA.length - 1;
  // enough letters for Heirloom, but the seal isn't a year old yet
  const waiting = st === last - 1 && sealed >= PATINA[last].at;
  const daysLeft = Math.max(1, Math.ceil(HEIRLOOM_DAYS - sealAgeDays(p.created_at)));
  const next = PATINA[st + 1];
  const from = PATINA[st].at;
  const pct = waiting ? Math.round(Math.min(1, sealAgeDays(p.created_at) / HEIRLOOM_DAYS) * 100)
    : next ? Math.round(((sealed - from) / (next.at - from)) * 100) : 100;
  const subject = who ? `${who} has` : 'You’ve';
  const sealOf = who ? `${who}’s seal` : 'your seal';
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="patina-steps">
        {PATINA.map((s, i) => (
          <div key={s.name} className={`patina-step${i === st ? ' now' : ''}${i > st ? ' later' : ''}`}>
            <span className="patina-seal"><Seal p={p} size={40} stage={i} /></span>
            <span className="small">{s.name}</span>
          </div>
        ))}
      </div>
      <p className="small muted">
        {st === 0
          ? <>{subject} sealed {sealed} letter{sealed === 1 ? '' : 's'}. At {PATINA[1].at}, {sealOf} starts to age.</>
          : <>Because {who ? `${who} has` : 'you’ve'} sealed {sealed} letters, {sealOf} is <b>{PATINA[st].name}</b>: {PATINA[st].note.charAt(0).toLowerCase() + PATINA[st].note.slice(1)}</>}
        {' '}<>{PATINA[last].name} needs {PATINA[last].at} letters and a seal at least a year old.</>
      </p>
      <div className="stack" style={{ gap: 4 }}>
        <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={next ? `Progress to ${next.name}` : 'Fully aged'}><i style={{ width: `${pct}%` }} /></div>
        <div className="row small muted" style={{ justifyContent: 'space-between' }}>
          <span>{sealed} sealed</span>
          <span>{waiting ? `${PATINA[last].name} in ${daysLeft} day${daysLeft === 1 ? '' : 's'}, when the seal turns one` : next ? `${next.at - sealed} more to ${next.name}` : 'Fully aged'}</span>
        </div>
      </div>
    </div>
  );
}

/** Rank: distance flown sets the perch the owl stands on and how fast it flies. */
function RankSteps({ p, who }: { p: Who; who?: string }) {
  const km = p.flown_km ?? 0;
  const r = rankIndex(km);
  const next = RANKS[r + 1];
  const from = RANKS[r].at;
  const pct = next ? Math.round(((km - from) / (next.at - from)) * 100) : 100;
  const owl = p.owl_name || (who ? `${who}’s owl` : 'Your owl');
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="patina-steps">
        {RANKS.map((x, i) => (
          <div key={x.id} className={`patina-step rank-step${i === r ? ' now' : ''}${i > r ? ' later' : ''}`}>
            <span className="rank-perch"><img src={`/owls/perch-${x.id}.webp`} alt="" /></span>
            <span className="small">{x.short}</span>
            <span className="rank-speed">{x.speed > 1 ? `+${speedPct(x.speed)}` : 'Usual'}</span>
          </div>
        ))}
      </div>
      <p className="small muted">
        {owl} has flown {km.toLocaleString('en-GB')} km, so {owl} is a <b>{RANKS[r].name}</b>
        {r === 0 ? ': a twig perch, and letters fly at the usual speed.' : `: ${RANKS[r].perch}, and letters fly ${speedPct(RANKS[r].speed)} faster.`}
      </p>
      <div className="stack" style={{ gap: 4 }}>
        <div className="bar" role="progressbar" aria-valuemin={from} aria-valuemax={next?.at ?? km} aria-valuenow={km} aria-label={next ? `Kilometres to ${next.name}` : 'Top rank'}><i style={{ width: `${pct}%` }} /></div>
        <div className="row small muted" style={{ justifyContent: 'space-between' }}><span>{km.toLocaleString('en-GB')} km</span><span>{next ? `${(next.at - km).toLocaleString('en-GB')} km to ${next.name}` : 'Top rank'}</span></div>
      </div>
    </div>
  );
}

/** Seal patina and owl rank, one card with two tabs. */
export function ProgressCard({ p, who }: { p: Who; who?: string }) {
  const [tab, setTab] = useState<'seal' | 'owl'>('seal');
  return (
    <section className="card progress-card">
      <div className="seg" role="tablist" aria-label="Progress">
        <button role="tab" aria-selected={tab === 'seal'} className={tab === 'seal' ? 'on' : ''} onClick={() => setTab('seal')}>Seal patina</button>
        <button role="tab" aria-selected={tab === 'owl'} className={tab === 'owl' ? 'on' : ''} onClick={() => setTab('owl')}>Owl rank</button>
      </div>
      {tab === 'seal' ? <PatinaSteps p={p} who={who} /> : <RankSteps p={p} who={who} />}
    </section>
  );
}
/** Kept for older callers: just the patina. */
export function PatinaCard({ p, who }: { p: Who; who?: string }) {
  return <section className="card progress-card"><h2>Seal patina</h2><PatinaSteps p={p} who={who} /></section>;
}

const ratio = (a: Achievement, s: SealStats) => { const pr = a.progress?.(s); return pr ? pr[0] / pr[1] : -1; };
const closest = (list: Achievement[], s: SealStats) => list.filter((a) => !a.done(s) && a.progress).sort((x, y) => ratio(y, s) - ratio(x, s));
const fmt = (a: Achievement, n: number) => `${n.toLocaleString('en-GB')}${a.unit ?? ''}`;

function Progress({ a, s, big }: { a: Achievement; s: SealStats; big?: boolean }) {
  const pr = a.progress?.(s);
  if (!pr || a.done(s)) return null;
  return (
    <span className={`ach-prog${big ? ' big' : ''}`}>
      <span className="bar"><i style={{ width: `${(pr[0] / pr[1]) * 100}%` }} /></span>
      <span className="small muted">{fmt(a, pr[0])} / {fmt(a, pr[1])}</span>
    </span>
  );
}

/** One achievement up close: how to earn it, how far along, and what it unlocks. */
export function AchievementSheet({ a, stats, p, mine, onClose }: { a: Achievement; stats: SealStats; p: Who; mine: boolean; onClose: () => void }) {
  const done = a.done(stats);
  const piece = a.kind === 'owl' ? pieceOf(a.reward) : undefined;
  const preview: Outfit = piece ? { [piece.slot]: piece.id } : {};
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="stamp-sheet stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={a.title}>
        <div className="row" style={{ alignItems: 'center', gap: 14 }}>
          <Badge a={a} done={done} size={72} />
          <div className="grow stack" style={{ gap: 2 }}>
            <span className="eyebrow">{a.kind === 'owl' ? 'Owl achievement' : 'Seal achievement'}{done ? ' · earned' : ''}</span>
            <h2 className="sheet-title">{a.title}</h2>
            <span className="muted">{a.desc}</span>
          </div>
          <button className="icon" onClick={onClose} aria-label="Close" style={{ alignSelf: 'flex-start' }}>{Icon.close}</button>
        </div>
        <Progress a={a} s={stats} big />
        {a.reward && (
          <div className="card row" style={{ padding: 12, gap: 14 }}>
            <span className="reward-pic">
              {piece ? <Owl p={p} outfit={preview} width={112} /> : <Seal p={{ ...p, mixins: [a.reward] }} size={84} />}
            </span>
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow gold">{done ? 'Unlocked' : 'Unlocks'}</span>
              <b style={{ fontSize: 18 }}>{piece ? piece.name : mixName(a.reward).replace(/^./, (c) => c.toUpperCase())}</b>
              <span className="small muted">{piece ? piece.note : 'Pressed into your wax seal.'}</span>
            </div>
          </div>
        )}
        <div className="foot" style={{ marginTop: 4 }}>
          {mine && done && a.reward && <button className="btn" onClick={() => go(piece ? 'dress' : 'setup/seal')}>{piece ? `Dress ${p.owl_name || 'your owl'}` : 'Use it on your seal'}</button>}
          <button className="btn wax" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

type Filter = 'all' | 'seal' | 'owl';
const pool = (f: Filter) => ACHIEVEMENTS.filter((a) => f === 'all' || a.kind === f);

/** Every achievement: the ones closest to done, the ones earned, and the rest. */
function AllAchievements({ stats, onPick, onClose }: { stats: SealStats; onPick: (a: Achievement) => void; onClose: () => void }) {
  const [f, setF] = useState<Filter>('all');
  const list = pool(f);
  const count = (k: Filter) => `${pool(k).filter((a) => a.done(stats)).length}/${pool(k).length}`;
  const next = closest(list, stats).slice(0, 4);
  const earned = list.filter((a) => a.done(stats));
  const rest = list.filter((a) => !a.done(stats) && !next.includes(a));
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="stamp-sheet stack all-ach" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="All achievements">
        <div className="row">
          <h2 className="sheet-title grow">Achievements</h2>
          <span className="small muted">{ACHIEVEMENTS.filter((a) => a.done(stats)).length} of {ACHIEVEMENTS.length}</span>
          <button className="icon" onClick={onClose} aria-label="Close">{Icon.close}</button>
        </div>
        <div className="chips tight">
          {(['all', 'seal', 'owl'] as const).map((k) => (
            <button key={k} className={`chip${f === k ? ' on' : ''}`} aria-pressed={f === k} onClick={() => setF(k)}>{k === 'all' ? 'All' : `${k === 'seal' ? 'Seal' : 'Owl'} · ${count(k)}`}</button>
          ))}
        </div>
        {next.length > 0 && <div className="stack" style={{ gap: 0 }}>
          <h3 className="sub">Closest next</h3>
          {next.map((a) => (
            <button key={a.id} className="next-row" onClick={() => onPick(a)}>
              <Badge a={a} done={false} size={36} />
              <span className="grow stack" style={{ gap: 4 }}>
                <span className="row" style={{ gap: 6, alignItems: 'baseline' }}><b>{a.title}</b><span className="small muted">{a.kind === 'owl' ? 'Owl' : 'Seal'}</span></span>
                <Progress a={a} s={stats} />
                {a.reward && <span className="small gold-text">Unlocks {rewardName(a)}</span>}
              </span>
            </button>
          ))}
        </div>}
        {earned.length > 0 && <div className="stack" style={{ gap: 8 }}>
          <h3 className="sub">Earned</h3>
          <div className="pill-grid">{earned.map((a) => <button key={a.id} className="ach-pill" onClick={() => onPick(a)}><Badge a={a} done size={30} /><span>{a.title}</span></button>)}</div>
        </div>}
        {rest.length > 0 && <div className="stack" style={{ gap: 8 }}>
          <h3 className="sub">Still to earn</h3>
          <div className="pill-grid">{rest.map((a) => <button key={a.id} className="ach-pill off" onClick={() => onPick(a)}><Badge a={a} done={false} size={30} /><span>{a.title}</span></button>)}</div>
        </div>}
      </div>
    </div>
  );
}

/** The achievements card: every patch at a glance, the closest next one, and a sheet with all of them.
 *  Pass `mine` on a friend's page to mark the ones you share. */
export function AchievementGrid({ stats, mine, p, own = false }: { stats: SealStats; mine?: SealStats | null; p: Who; own?: boolean }) {
  const [f, setF] = useState<Filter>('all');
  const [open, setOpen] = useState<Achievement | null>(null);
  const [all, setAll] = useState(false);
  const list = pool(f);
  const earned = list.filter((a) => a.done(stats)).length;
  const shared = mine ? ACHIEVEMENTS.filter((a) => a.done(stats) && a.done(mine)).length : 0;
  const next = closest(list, stats)[0];
  return (
    <section className="card ach-card">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h2 className="grow">Achievements</h2>
        <span className="small muted">{earned} of {list.length} earned{shared ? ` · ${shared} shared with you` : ''}</span>
      </div>
      <div className="chips tight">
        {(['all', 'seal', 'owl'] as const).map((k) => (
          <button key={k} className={`chip${f === k ? ' on' : ''}`} aria-pressed={f === k} onClick={() => setF(k)}>{k === 'all' ? 'All' : k === 'seal' ? 'Seal' : 'Owl'}</button>
        ))}
      </div>
      <div className="badge-grid">
        {list.map((a) => {
          const done = a.done(stats);
          const pr = !done ? a.progress?.(stats) : undefined;
          return (
            <button key={a.id} className="badge-tile" onClick={() => setOpen(a)} aria-label={`${a.title}${done ? '' : pr ? ', in progress' : ', not earned yet'}`}>
              <Badge a={a} done={done} />
              {pr && <span className="badge-bar" aria-hidden="true"><i style={{ width: `${(pr[0] / pr[1]) * 100}%` }} /></span>}
            </button>
          );
        })}
      </div>
      {next && (
        <button className="next-card" onClick={() => setOpen(next)}>
          <Badge a={next} done={false} size={46} />
          <span className="grow stack" style={{ gap: 3, minWidth: 0 }}>
            <span className="small muted" style={{ fontSize: 12 }}>Closest next</span>
            <b style={{ fontSize: 15 }}>{next.title}</b>
            <Progress a={next} s={stats} />
            {next.reward && <span className="small gold-text">Unlocks {rewardName(next)}</span>}
          </span>
          <span aria-hidden="true" style={{ fontSize: 22, color: 'var(--muted)' }}>›</span>
        </button>
      )}
      <button className="chip mini-chip" onClick={() => setAll(true)}>See all {ACHIEVEMENTS.length}</button>
      {all && createPortal(<AllAchievements stats={stats} onPick={(a) => setOpen(a)} onClose={() => setAll(false)} />, document.body)}
      {open && createPortal(<AchievementSheet a={open} stats={stats} p={p} mine={own} onClose={() => setOpen(null)} />, document.body)}
    </section>
  );
}
