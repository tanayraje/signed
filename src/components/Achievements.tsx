import type { ReactNode } from 'react';
import type { Profile } from '../lib/types';
import { ACHIEVEMENTS, type Achievement, type SealStats } from '../lib/achievements';
import { PATINA, Seal, patinaStage } from './bits';

const MIX_NAMES: Record<string, string> = {
  feather: 'owl feather', cornflower: 'cornflower petals', babysbreath: "baby's breath", chamomile: 'chamomile',
  forgetmenot: 'forget-me-nots', lace: 'lace', marigold: 'marigold petals', bow: 'ribbon bow'
};
export const mixName = (m: string) => MIX_NAMES[m] ?? m;

const ICONS: Record<Achievement['icon'], ReactNode> = {
  letter: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  moon: <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z" />,
  route: <><circle cx="5" cy="18" r="2" /><circle cx="19" cy="6" r="2" /><path d="M6.5 16.5C10 10 14 14 17.5 7.5" strokeDasharray="2 2.5" /></>,
  wave: <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  shelf: <><rect x="4" y="4" width="16" height="16" rx="1" /><path d="M4 12h16M12 4v16" /></>,
  leaf: <><path d="M5 19C5 10 11 5 19 5c0 8-5 14-14 14z" /><path d="M5 19l8-8" /></>,
  ring: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /></>
};

/** How far a seal has aged, with the five stages and a bar to the next one. */
export function PatinaCard({ p, who }: { p: Pick<Profile, 'wax' | 'monogram' | 'name' | 'mixins' | 'edge' | 'mark' | 'plume'> & { sealed?: number }; who?: string }) {
  const sealed = p.sealed ?? 0;
  const st = patinaStage(sealed);
  const next = PATINA[st + 1];
  const from = PATINA[st].at;
  const pct = next ? Math.round(((sealed - from) / (next.at - from)) * 100) : 100;
  const subject = who ? `${who} has` : 'You’ve';
  const sealOf = who ? `${who}’s seal` : 'your seal';
  return (
    <div className="card patina">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h2 className="grow" style={{ margin: 0 }}>Seal patina</h2>
        <span className="small muted">{next ? `${next.at - sealed} letter${next.at - sealed === 1 ? '' : 's'} to ${next.name}` : 'Fully aged'}</span>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        {st === 0
          ? `${subject} sealed ${sealed} letter${sealed === 1 ? '' : 's'}. At 10, ${sealOf} starts to age.`
          : <>Because {who ? `${who} has` : 'you’ve'} sealed {sealed} letters, {sealOf} is <b>{PATINA[st].name}</b>: {PATINA[st].note.charAt(0).toLowerCase() + PATINA[st].note.slice(1)}</>}
      </p>
      <div className="patina-steps">
        {PATINA.map((s, i) => (
          <div key={s.name} className={`patina-step${i === st ? ' now' : ''}${i > st ? ' later' : ''}`}>
            <span className="patina-seal"><Seal p={p} size={40} stage={i} /></span>
            <span className="small">{s.name}</span>
          </div>
        ))}
      </div>
      {next && <>
        <div className="bar" role="progressbar" aria-valuemin={from} aria-valuemax={next.at} aria-valuenow={sealed} aria-label={`Letters to ${next.name}`}><i style={{ width: `${pct}%` }} /></div>
        <div className="row small muted" style={{ justifyContent: 'space-between' }}><span>{from}</span><span>{sealed} sealed</span><span>{next.at}</span></div>
      </>}
    </div>
  );
}

/** The achievement cards. Pass `mine` on a friend's page to mark the ones you share. */
export function AchievementGrid({ stats, mine }: { stats: SealStats; mine?: SealStats | null }) {
  const earned = ACHIEVEMENTS.filter((a) => a.done(stats)).length;
  return (
    <section className="stack">
      <div className="row" style={{ alignItems: 'baseline' }}>
        <h2 className="grow" style={{ margin: 0 }}>Achievements</h2>
        <span className="small muted">{earned} of {ACHIEVEMENTS.length}</span>
      </div>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const done = a.done(stats);
          const prog = a.progress?.(stats);
          const both = mine && done && a.done(mine);
          return (
            <div key={a.id} className={`ach${done ? ' done' : ''}`}>
              <span className="ach-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICONS[a.icon]}</svg>
              </span>
              <b>{a.title}</b>
              {both && <span className="ach-shared">You have this too</span>}
              <span className="small muted">{a.desc}</span>
              {!done && prog && <span className="ach-prog"><span className="bar"><i style={{ width: `${(prog[0] / prog[1]) * 100}%` }} /></span><span className="small muted">{prog[0].toLocaleString()} / {prog[1].toLocaleString()}{a.id === 'long_haul' ? ' km' : ''}</span></span>}
              {a.reward && <span className="ach-reward"><i aria-hidden="true" />{done ? 'Unlocked' : 'Unlocks'} {mixName(a.reward)}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
