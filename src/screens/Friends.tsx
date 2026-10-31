import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { DAYS, timeLeft } from '../lib/format';
import { Nav, Seal, Wordmark } from '../components/bits';

export default function Friends() {
  const { me, friends, letters, incoming, say, session } = useStore();
  const [invite, setInvite] = useState<string | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  if (!me) return null;
  const uid = session!.user.id;

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

  return (
    <main className="app">
      <div className="top"><div className="grow"><Wordmark /></div></div>
      <h1>Your friends</h1>
      {friends.length === 0 && (
        <div className="stone stack center" style={{ padding: 24, alignItems: 'center' }}>
          <p>No one to write to yet.</p>
          <p className="small muted">Send an invite link. Once your friend opens it and signs in, you can start writing.</p>
        </div>
      )}
      <ul className="list">
        {friends.map(({ profile: f, mine }) => {
          const waiting = letters.filter((l) => l.sender === f.id && l.recipient === uid && !l.opened_at && new Date(l.arrive_at).getTime() <= Date.now());
          const inc = incoming.filter((l) => l.sender === f.id);
          const out = letters.filter((l) => l.sender === uid && l.recipient === f.id && new Date(l.arrive_at).getTime() > Date.now());
          let status = `Post day is ${DAYS[mine.post_day]}`;
          if (waiting.length) status = `Wrote to you. ${f.owl_name} is waiting.`;
          else if (inc.length) status = `A letter lands in ${timeLeft(inc[0].arrive_at)}`;
          else if (out.length) status = `Your letter lands in ${timeLeft(out[0].arrive_at)}`;
          return (
            <li key={f.id}>
              <button className="item" onClick={() => go(`friend/${f.id}`)}>
                <Seal p={f} size={56} />
                <span className="grow stack" style={{ gap: 2 }}>
                  <span style={{ fontSize: 19, fontWeight: 600 }}>{f.name || 'A friend'}</span>
                  <span className="small muted">{status}</span>
                </span>
                {waiting.length > 0 && <span className="dot" aria-label="New letter" />}
              </button>
            </li>
          );
        })}
      </ul>
      <button className="btn block" style={{ borderStyle: 'dashed' }} onClick={makeInvite}>Invite a friend</button>
      {invite && (
        <div className="card stack" style={{ padding: 14 }}>
          <span className="small muted">Send this link to your friend. It works once.</span>
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
