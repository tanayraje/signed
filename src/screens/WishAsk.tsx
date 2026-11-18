import { useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { Seal } from '../components/bits';
import { StarField } from './Wish';

/** A friend asked to make 11:11 wishes together: join them, or say not now. */
export default function WishAsk({ id }: { id: string }) {
  const { me, friend, saveFriendSettings, refresh, say } = useStore();
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const f = friend(id);
  if (!me) return null;
  const name = f?.profile.name || 'Your friend';
  const asked = !!f?.theirs?.wish_1111;
  const already = !!f?.mine.wish_1111 && asked;

  async function join() {
    setBusy(true);
    await saveFriendSettings(id, { wish_1111: true });
    setBusy(false);
    setJoined(true);
  }
  async function decline() {
    setBusy(true);
    const { error } = await supabase.rpc('decline_wish', { requester: id });
    setBusy(false);
    if (error) { say('That did not go through. Try again.'); return; }
    await refresh();
    go(f ? `friend/${id}` : 'wall');
  }

  const together = joined || already;
  const now = new Date();
  const next = now.getHours() < 11 || (now.getHours() === 11 && now.getMinutes() < 11) ? 'this morning' : now.getHours() < 23 || (now.getHours() === 23 && now.getMinutes() < 11) ? 'tonight' : 'tomorrow morning';
  const ring = { padding: 6, borderRadius: '50%', boxShadow: '0 0 0 1.4px rgba(226,194,122,.55), 0 0 30px rgba(226,194,122,.25)', lineHeight: 0 } as const;

  return (
    <div className="wish" role="dialog" aria-modal="true" aria-label="11:11 wish request">
      <StarField />
      <div className="comet" aria-hidden="true" />
      <main className="app">
        <span className="small" style={{ color: '#C9BFA8' }}>{together ? 'Wish alarm set' : 'A wish request'}</span>
        <span style={{ fontSize: 88, lineHeight: 1, color: '#F3E3B5' }}>11:11</span>
        {f && (together ? (
          <div className="row" style={{ justifyContent: 'center', gap: 18, marginTop: 36 }}>
            <span style={ring}><Seal p={f.profile} size={80} label={`${name}'s seal`} /></span>
            <span style={ring}><Seal p={me} size={80} label="Your seal" /></span>
          </div>
        ) : (
          <div className="row" style={{ justifyContent: 'center', gap: 14, marginTop: 36 }}>
            <Seal p={f.profile} size={84} label={`${name}'s seal`} />
            <svg width="46" height="12" viewBox="0 0 46 12" aria-hidden="true"><path d="M2 6 H44" stroke="#E2C27A" strokeWidth="1.4" strokeDasharray="1 5" strokeLinecap="round" fill="none" /></svg>
            <span style={{ width: 84, height: 84, borderRadius: '50%', border: '1.4px dashed rgba(226,194,122,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: asked ? 1 : 0.5 }}>
              <span style={{ opacity: 0.45, lineHeight: 0 }}><Seal p={me} size={64} /></span>
            </span>
          </div>
        ))}
        <div className="stack" style={{ marginTop: 18 }}>
          {together ? (
            <>
              <h1 style={{ fontWeight: 400, fontStyle: 'italic', color: '#F3E3B5' }}>You’re wishing together</h1>
              <p style={{ color: '#C9BFA8', maxWidth: 300, margin: '0 auto' }}>{joined ? `${name} will know you said yes. ` : ''}Next alarm: {next} at 11:11.</p>
            </>
          ) : asked ? (
            <>
              <h1 style={{ fontWeight: 400, fontStyle: 'italic', color: '#F1E7CF' }}>{name} wants to make a wish with you</h1>
              <p style={{ color: '#C9BFA8', maxWidth: 300, margin: '0 auto' }}>Say yes, and an alarm rings for you both at 11:11, morning and night. You each hold to make a wish, and it flies to the other.</p>
            </>
          ) : (
            <>
              <h1 style={{ fontWeight: 400, fontStyle: 'italic', color: '#F1E7CF' }}>This request has passed</h1>
              <p style={{ color: '#C9BFA8', maxWidth: 300, margin: '0 auto' }}>{name} isn’t asking right now. You can ask them yourself from their page.</p>
            </>
          )}
        </div>
        <div className="spacer" />
        <div className="stack" style={{ width: '100%' }}>
          {together || !asked ? (
            <button className="btn block" style={{ color: '#F3E3B5', borderColor: '#E2C27A' }} onClick={() => go(f ? `friend/${id}` : 'wall')}>Done</button>
          ) : (
            <>
              <button className="btn block" disabled={busy} style={{ background: '#E2C27A', borderColor: '#E2C27A', color: '#0F1424', fontWeight: 600, minHeight: 60 }} onClick={join}>Join {name}</button>
              <button className="btn block" disabled={busy} style={{ color: '#F1E7CF', borderColor: '#3B4566' }} onClick={decline}>Not now</button>
              <span className="small" style={{ color: '#A89F8C', textAlign: 'center' }}>You can change this anytime on {name}’s page.</span>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
