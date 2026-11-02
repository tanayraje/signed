import { useEffect, useState } from 'react';
import { useStore } from './lib/store';
import { useRoute, go } from './lib/router';
import SignIn, { restorePlace } from './screens/SignIn';
import Setup from './screens/Setup';
import Friends from './screens/Friends';
import Friend from './screens/Friend';
import Pocket from './screens/Pocket';
import Compose from './screens/Compose';
import Flight from './screens/Flight';
import Opening from './screens/Opening';
import Reader from './screens/Reader';
import Wall from './screens/Wall';
import Seals from './screens/Seals';
import Profile from './screens/Profile';
import Wish from './screens/Wish';
import Invite from './screens/Invite';
import Stamps from './screens/Stamps';
import Cutter from './screens/Cutter';

export default function App() {
  const { session, ready, me, friends, toast } = useStore();
  const [r0, r1] = useRoute();
  const [alarm, setAlarm] = useState(false);

  // After signing in, go back to where the person was headed (an invite link, for example).
  useEffect(() => { if (session) restorePlace(); }, [session]);

  // While the app is open, ring the 11:11 alarm on screen too (push covers when it's closed).
  useEffect(() => {
    let last = '';
    const t = window.setInterval(() => {
      const d = new Date();
      const key = `${d.toDateString()}-${d.getHours()}`;
      if (d.getMinutes() === 11 && (d.getHours() === 11 || d.getHours() === 23) && key !== last
        && friends.some((f) => f.mine.wish_1111 && f.theirs?.wish_1111)) {
        last = key;
        setAlarm(true);
      }
    }, 5000);
    return () => window.clearInterval(t);
  }, [friends]);

  if (!ready) return null;
  if (!session) {
    // Keep an invite link in the address so it opens after sign-in.
    return <SignIn />;
  }
  if (!me) return <main className="app"><p className="muted">Opening your desk…</p></main>;
  if (!me.onboarded && r0 !== 'setup') { go('setup/seal'); return null; }

  let screen;
  switch (r0) {
    case 'setup': screen = <Setup step={r1 === 'owl' ? 'owl' : 'seal'} />; break;
    case 'invite': screen = <Invite code={r1} />; break;
    case 'friend': screen = <Friend id={r1} />; break;
    case 'pocket': screen = <Pocket id={r1} />; break;
    case 'write': screen = <Compose id={r1} />; break;
    case 'flight': screen = <Flight id={r1} />; break;
    case 'open': screen = <Opening id={r1} />; break;
    case 'read': screen = <Reader id={r1} />; break;
    case 'wall': screen = <Wall />; break;
    case 'seals': screen = <Seals />; break;
    case 'stamps': screen = <Stamps />; break;
    case 'cutter': screen = <Cutter />; break;
    case 'profile': screen = <Profile />; break;
    case 'wish': screen = <Wish />; break;
    default: screen = <Friends />;
  }

  return (
    <>
      {screen}
      {alarm && r0 !== 'wish' && <Wish onClose={() => setAlarm(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
