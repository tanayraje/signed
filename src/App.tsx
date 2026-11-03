import { useEffect, useState } from 'react';
import { useStore } from './lib/store';
import { useRoute, go } from './lib/router';
import { supabase } from './lib/supabase';
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
import Tour from './screens/Tour';
import { Owl } from './components/bits';

export default function App() {
  const { session, ready, me, friends, toast, letters, friend, say, refresh } = useStore();
  const [r0, r1, r2] = useRoute();
  const [alarm, setAlarm] = useState(false);

  // After signing in, go back to where the person was headed.
  useEffect(() => { if (session) restorePlace(); }, [session]);

  // A remembered invite is accepted as soon as there is an account, before seal setup.
  useEffect(() => {
    if (!session) return;
    let code: string | null = null;
    try { code = localStorage.getItem('signed.pendingInvite'); } catch { /* storage blocked */ }
    if (!code) return;
    void (async () => {
      const { data, error } = await supabase.rpc('accept_invite', { invite_code: code });
      try { localStorage.removeItem('signed.pendingInvite'); } catch { /* fine */ }
      if (error) { if (!/your own/i.test(error.message)) say(error.message || 'That invite did not work.'); return; }
      await refresh();
      const who = (await supabase.from('profiles').select('name').eq('id', data as string).single()).data?.name;
      say(who ? `You and ${who} are friends now.` : 'You have a new friend.');
    })();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coming back after a while away starts on the Wall too (a half-written letter keeps its draft).
  useEffect(() => {
    let hiddenAt = 0;
    const on = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      const route = window.location.hash.replace(/^#\/?/, '').split('/')[0];
      if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000 && !['wall', 'write', 'setup', 'open', 'read', 'wish', 'invite', 'tour'].includes(route)) go('wall');
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  // Letters that have landed and wait to be opened: a badge on the app icon, an owl perched up top.
  const [, tickNow] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tickNow((n) => n + 1), 15000); return () => window.clearInterval(t); }, []);
  const uid = session?.user.id;
  const waiting = letters.filter((l) => l.recipient === uid && !l.opened_at && new Date(l.arrive_at).getTime() <= Date.now());
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (waiting.length) void nav.setAppBadge?.(waiting.length).catch(() => undefined);
    else void nav.clearAppBadge?.().catch(() => undefined);
  }, [waiting.length]);

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

  // The welcome tour shows once, right after someone first sets up; Profile can open it again.
  if (me.onboarded && me.toured === false && r0 !== 'tour' && r0 !== 'setup' && r0 !== 'invite') { go('tour'); return null; }

  let screen;
  switch (r0) {
    case 'setup': screen = <Setup step={r1 === 'owl' ? 'owl' : 'seal'} />; break;
    case 'invite': screen = <Invite code={r1} />; break;
    case 'friend': screen = <Friend id={r1} />; break;
    case 'pocket': screen = <Pocket id={r1} />; break;
    case 'write': screen = <Compose id={r1} />; break;
    case 'flight': screen = <Flight id={r1} />; break;
    case 'open': screen = <Opening id={r1} />; break;
    case 'read': screen = <Reader id={r1} from={r2} />; break;
    case 'seals': screen = <Seals />; break;
    case 'stamps': screen = <Stamps />; break;
    case 'tour': screen = <Tour />; break;
    case 'cutter': screen = <Cutter />; break;
    case 'profile': screen = <Profile />; break;
    case 'wish': screen = <Wish />; break;
    case 'friends': screen = <Friends />; break;
    default: screen = <Wall />;
  }

  return (
    <>
      {screen}
      {waiting.length > 0 && !['open', 'read', 'cutter', 'wish', 'setup'].includes(r0) && (() => {
        const l = waiting[0]; const p = friend(l.sender)?.profile;
        if (!p) return null;
        return (
          <button className="perch" onClick={() => go(`open/${l.id}`)} aria-label={`${p.owl_name} landed with a letter from ${p.name}. Open it.`}>
            <Owl p={p} width={26} />
            {waiting.length > 1 && <span className="perch-n">{waiting.length}</span>}
          </button>
        );
      })()}
      {alarm && r0 !== 'wish' && <Wish onClose={() => setAlarm(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
