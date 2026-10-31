import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { ago } from '../lib/format';
import { enablePush, isInstalled } from '../lib/push';
import type { Profile as P } from '../lib/types';
import { Nav, Seal, signOut } from '../components/bits';
import { OwlEditor } from './Setup';

export default function Profile() {
  const { me, friends, saveMe, saveFriendSettings, session, say } = useStore();
  const [draft, setDraft] = useState<P | null>(me);
  const timer = useRef(0);
  useEffect(() => { if (me && !draft) setDraft(me); }, [me, draft]);
  if (!me || !draft) return null;

  const set = (patch: Partial<P>) => {
    setDraft({ ...draft, ...patch });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void saveMe(patch), 400);
  };

  return (
    <main className="app">
      <div className="top"><h1 className="grow">Your owl</h1></div>
      <OwlEditor draft={draft} set={set} />

      <div className="card" style={{ padding: '2px 16px' }}>
        <div className="row" style={{ minHeight: 60 }}>
          <Seal p={me} size={42} />
          <span className="grow">Your seal</span>
          <button className="chip" onClick={() => go('setup/seal')}>Redesign</button>
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
            <span className="small muted">{isInstalled() ? 'Know when an owl lands and when it is 11:11.' : 'Add Signed to your Home Screen first, then turn these on.'}</span>
          </span>
          <button className="chip" onClick={async () => say(await enablePush(session!.user.id))}>Turn on</button>
        </div>
        <label className="toggle" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="grow stack" style={{ gap: 0 }}><span>Quick flights</span><span className="small muted">For testing: your letters land in one minute</span></span>
          <input type="checkbox" checked={draft.quick_flights} onChange={(e) => set({ quick_flights: e.target.checked })} />
        </label>
      </div>
      <div className="chips">
        <button className="chip" onClick={() => go('wish')}>Preview the 11:11 alarm</button>
        <button className="chip" onClick={() => void signOut()}>Sign out</button>
      </div>
      <Nav on="profile" />
    </main>
  );
}
