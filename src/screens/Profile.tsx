import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { ago } from '../lib/format';
import { enablePush, isInstalled, preparePush, pushState } from '../lib/push';
import { useEffect, useState } from 'react';
import { Nav, Owl, Seal, signOut } from '../components/bits';

export default function Profile() {
  const { me, friends, saveFriendSettings, session, say } = useStore();
  const [push, setPush] = useState<'on' | 'off' | 'blocked' | 'unsupported' | null>(null);
  const [pushMsg, setPushMsg] = useState('');
  useEffect(() => { void pushState().then(setPush); void preparePush(); }, []);
  if (!me) return null;

  return (
    <main className="app">
      <div className="top">
        <h1 className="grow">{me.name || 'You'}</h1>
      </div>

      <div className="card" style={{ padding: '2px 16px' }}>
        <div className="row" style={{ minHeight: 64 }}>
          <Seal p={me} size={42} />
          <span className="grow">Your seal</span>
          <button className="chip" onClick={() => go('setup/seal')}>Redesign</button>
        </div>
        <div className="row" style={{ minHeight: 64, borderTop: '1px solid var(--line)' }}>
          <span style={{ width: 42, display: 'flex', justifyContent: 'center' }}><Owl p={me} width={34} /></span>
          <span className="grow stack" style={{ gap: 0 }}><span>{me.owl_name}</span><span className="small muted">Your owl</span></span>
          <button className="chip" onClick={() => go('setup/owl')}>Preen</button>
        </div>
        <div className="row" style={{ minHeight: 60, borderTop: '1px solid var(--line)' }}>
          <span className="grow stack" style={{ gap: 0 }}>
            <span>{me.last_place ? `Near ${me.last_place}` : 'Location not shared'}</span>
            <span className="small muted">{me.last_place ? `Updated ${ago(me.last_seen_at)}. Signed checks each time you open it.` : 'Allow location so owls know where to fly.'}</span>
          </span>
        </div>
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
        <div className="row" style={{ minHeight: 60 }}>
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
            ? <span className="chip on" aria-label="Notifications are on">On</span>
            : push !== 'blocked' && push !== 'unsupported' && <button className="chip" onClick={async () => { setPushMsg('Asking your phone…'); const m = await enablePush(session!.user.id); setPushMsg(m); say(m); setPush(await pushState()); }}>Turn on</button>}
        </div>
        {pushMsg && push !== 'on' && <p className="small" role="status" style={{ margin: 0, padding: '0 0 12px', color: '#7A2420' }}>{pushMsg}</p>}
      </div>
      <button className="item card" onClick={() => go('tour')}>
        <span className="grow stack" style={{ gap: 0 }}><span>How Signed works</span><span className="small muted">The short tour, again</span></span>
        <span aria-hidden="true" style={{ fontSize: 22, color: 'var(--muted)' }}>›</span>
      </button>
      <div className="chips">
        <button className="chip" onClick={() => go('wish')}>Preview the 11:11 alarm</button>
        <button className="chip" onClick={() => void signOut()}>Sign out</button>
      </div>
      <Nav on="profile" />
    </main>
  );
}
