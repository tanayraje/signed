import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { ago } from '../lib/format';
import { rememberPushChoice } from '../components/NotifyAsk';
import { disablePush, enablePush, isInstalled, preparePush, pushState } from '../lib/push';
import { useEffect, useState } from 'react';
import { Nav, Owl, PATINA, Seal, Top, patinaStage, signOut } from '../components/bits';
import { AchievementGrid, ProgressCard } from '../components/Achievements';
import { localStats, useSealStats } from '../lib/achievements';
import { breedName, rankOf, speedPct } from '../lib/owl';

const GEAR = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;

export default function Profile() {
  const { me, friends, letters, session } = useStore();
  const uid = session?.user.id;
  const stats = useSealStats(uid, uid ? localStats(uid, letters, friends) : undefined);
  if (!me) return null;
  const sealed = stats?.sealed ?? me.sealed ?? 0;
  const km = Math.max(me.flown_km ?? 0, Math.round(stats?.km ?? 0));
  const p = { ...me, sealed, flown_km: km };
  const rank = rankOf(km);

  return (
    <main className="app">
      <div className="top">
        <h1 className="grow profile-sig">{me.name || 'You'}</h1>
        <button className="icon" onClick={() => go('settings')} aria-label="Settings">{GEAR}</button>
      </div>

      <section className="card duo" aria-label="Your seal and owl">
        <div className="duo-half">
          <span className="duo-pic"><Seal p={p} size={92} label="Your wax seal" /></span>
          <b>Your seal</b>
          <span className="small muted">{PATINA[patinaStage(sealed, me.created_at)].name} · {sealed} sealed</span>
          <button className="chip mini-chip" onClick={() => go('setup/seal')}>Redesign</button>
        </div>
        <div className="duo-half">
          {rank.speed > 1 && <span className="speed-tag corner">{speedPct(rank.speed)} faster</span>}
          <span className="duo-pic"><Owl p={p} perch width={92} alt={`${me.owl_name}, your ${breedName(me.breed).toLowerCase()}, on ${rank.perch}`} /></span>
          <b>{me.owl_name}</b>
          <span className="small muted">{breedName(me.breed)} · {rank.short}</span>
          <button className="chip mini-chip" onClick={() => go('dress')}>Dress</button>
        </div>
      </section>

      <ProgressCard p={p} />
      {stats && <AchievementGrid stats={stats} p={p} own />}

      {friends.length > 0 && (
        <section className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <h2 className="grow">Friends</h2>
            <span className="small muted">Tap to see their seal and owl</span>
          </div>
          <div className="friend-cards hscroll">
            {friends.map(({ profile: f }) => (
              <button key={f.id} className="card friend-card" onClick={() => go(`friend/${f.id}/achievements`)}>
                <span className="friend-pics"><Seal p={f} size={48} /><Owl p={f} width={42} /></span>
                <span className="friend-ach-name">{f.name}</span>
                <span className="small muted" style={{ fontSize: 12 }}>{f.sealed != null ? PATINA[patinaStage(f.sealed, f.created_at)].name : 'Seal'} · {rankOf(f.flown_km).short}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      <Nav on="profile" />
    </main>
  );
}

/** Everything that used to crowd the profile: location, notifications, 11:11, the tour, signing out. */
export function Settings() {
  const { me, friends, saveFriendSettings, session, say } = useStore();
  const [push, setPush] = useState<'on' | 'off' | 'blocked' | 'unsupported' | null>(null);
  const [pushMsg, setPushMsg] = useState('');
  useEffect(() => { void pushState().then(setPush); void preparePush(); }, []);
  if (!me) return null;
  return (
    <main className="app">
      <Top title="Settings" back="profile" />
      <div className="card" style={{ padding: '2px 16px' }}>
        <div className="row" style={{ minHeight: 60 }}>
          <span className="grow stack" style={{ gap: 0 }}>
            <span>{me.last_place ? `Near ${me.last_place}` : 'Location not shared'}</span>
            <span className="small muted">{me.last_place ? `Updated ${ago(me.last_seen_at)}. Signed checks each time you open it.` : 'Allow location so owls know where to fly.'}</span>
          </span>
        </div>
        <div className="row" style={{ minHeight: 60, borderTop: '1px solid var(--line)' }}>
          <span className="grow stack" style={{ gap: 0 }}>
            <span>Notifications</span>
            <span className="small muted">{
              push === 'on' ? 'On for this phone. You’ll hear when an owl lands and at 11:11.'
                : push === 'blocked' ? 'Blocked in your phone settings. Allow Signed there to turn them on.'
                  : push === 'unsupported' && !isInstalled() ? 'Add Signed to your Home Screen first, then turn these on.'
                    : push === 'unsupported' ? 'This phone can’t show notifications from Signed.'
                      : 'Know when an owl lands and when it is 11:11.'}</span>
          </span>
          {push === 'on'
            ? <button className="chip on" onClick={async () => { const m = await disablePush(); rememberPushChoice(false); setPushMsg(''); say(m); setPush(await pushState()); }} aria-label="Notifications are on. Turn them off">On · Turn off</button>
            : push !== 'blocked' && push !== 'unsupported' && <button className="chip" onClick={async () => { setPushMsg('Asking your phone…'); const m = await enablePush(session!.user.id); if (m === 'Notifications are on.') rememberPushChoice(true); setPushMsg(m); say(m); setPush(await pushState()); }}>Turn on</button>}
        </div>
        {pushMsg && push !== 'on' && <p className="small" role="status" style={{ margin: 0, padding: '0 0 12px', color: '#7A2420' }}>{pushMsg}</p>}
      </div>

      <div className="card" style={{ padding: '10px 16px 2px' }}>
        <div className="stack" style={{ gap: 0, paddingBottom: 8 }}>
          <span>Wish together at 11:11</span>
          <span className="small muted">Only the friends you choose get the alarm with you. It rings when you both turn it on.</span>
        </div>
        {friends.map(({ profile: f, mine, theirs }) => (
          <label key={f.id} className="toggle" style={{ borderTop: '1px solid var(--line)' }}>
            <Seal p={f} size={30} />
            <span className="grow stack" style={{ gap: 0 }}>
              <span>{f.name}</span>
              {mine.wish_1111 && !theirs?.wish_1111 && <span className="small muted">Waiting for {f.name} to turn it on</span>}
            </span>
            <input type="checkbox" checked={mine.wish_1111} onChange={(e) => void saveFriendSettings(f.id, { wish_1111: e.target.checked })} />
          </label>
        ))}
        {friends.length === 0 && <p className="small muted" style={{ paddingBottom: 12 }}>Invite a friend first.</p>}
      </div>

      <div className="card" style={{ padding: '2px 16px' }}>
        <button className="set-row" onClick={() => go('tour')}>
          <span className="grow stack" style={{ gap: 0 }}><span>How Signed works</span><span className="small muted">The short tour, again</span></span>
          <span aria-hidden="true" className="chev">›</span>
        </button>
        <button className="set-row" onClick={() => go('wish')} style={{ borderTop: '1px solid var(--line)' }}>
          <span className="grow stack" style={{ gap: 0 }}><span>Preview the 11:11 alarm</span><span className="small muted">See what rings when you both wish</span></span>
          <span aria-hidden="true" className="chev">›</span>
        </button>
      </div>
      <button className="btn block" onClick={() => void signOut()}>Sign out</button>
    </main>
  );
}
