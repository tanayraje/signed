import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { DAYS, ago, timeLeft } from '../lib/format';
import { km } from '../lib/geo';
import { Icon, Owl, Seal, Stamp } from '../components/bits';
import FlightMap from '../components/FlightMap';
import { supabase } from '../lib/supabase';

export default function Friend({ id }: { id: string }) {
  const { me, friend, letters, incoming, session, saveFriendSettings } = useStore();
  const [scrapCount, setScrapCount] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  useEffect(() => {
    void supabase.from('scraps').select('id', { count: 'exact', head: true }).eq('friend', id).then(({ count }) => setScrapCount(count ?? 0));
  }, [id]);
  const f = friend(id);
  if (!me || !f) return <main className="app"><p className="muted">Loading…</p></main>;
  const uid = session!.user.id;
  const p = f.profile;
  const now = Date.now();
  const waiting = letters.filter((l) => l.sender === p.id && l.recipient === uid && !l.opened_at && new Date(l.arrive_at).getTime() <= now);
  const inc = incoming.filter((l) => l.sender === p.id);
  const out = letters.filter((l) => l.sender === uid && l.recipient === p.id && new Date(l.arrive_at).getTime() > now);
  const dist = me.last_lat != null && p.last_lat != null ? Math.round(km([me.last_lat, me.last_lon!], [p.last_lat, p.last_lon!])) : null;
  const bothWish = f.mine.wish_1111 && f.theirs?.wish_1111;

  let hero;
  if (waiting.length) {
    const l = waiting[waiting.length - 1];
    hero = (
      <section className="stone stack" style={{ alignItems: 'center', padding: '46px 16px 18px', gap: 14 }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 300, height: 180 }}>
          <div className="env" style={{ position: 'absolute', left: '4%', right: '4%', top: 22, bottom: 0, transform: 'rotate(-2.5deg)' }}>
            <svg viewBox="0 0 282 160" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}><path d="M0 1L141 90L282 1" fill="none" stroke="#CDBFA8" /></svg>
            <div style={{ position: 'absolute', right: 10, top: 10 }}><Stamp id={l.stamp} /></div>
            <span style={{ position: 'absolute', left: 16, bottom: 12, fontStyle: 'italic', color: '#2B2622' }}>For {me.name}</span>
            <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-40%)' }}><Seal p={p} size={64} /></span>
          </div>
          <div style={{ position: 'absolute', left: '8%', top: -62 }}><Owl p={p} width={76} alt={`${p.name}'s owl, ${p.owl_name}, waiting on the envelope`} /></div>
        </div>
        <p className="center" style={{ maxWidth: 290 }}>{p.name} wrote to you. {p.owl_name} is waiting for your reply.</p>
        <button className="btn wax block" onClick={() => go(`open/${l.id}`)}>Lift the seal</button>
      </section>
    );
  } else if (inc.length) {
    hero = (
      <button className="stone stack center" onClick={() => go(`flight/${inc[0].id}`)} style={{ alignItems: 'center', padding: '20px 16px', gap: 8, border: 0, width: '100%' }}>
        <Owl p={p} width={56} />
        <span>{p.owl_name} is on the way with a letter from {p.name}.</span>
        <span className="small muted">Lands in {timeLeft(inc[0].arrive_at)}. Tap to watch.</span>
      </button>
    );
  } else if (out.length) {
    hero = (
      <button className="stone stack center" onClick={() => go(`flight/${out[0].id}`)} style={{ alignItems: 'center', padding: '20px 16px', gap: 8, border: 0, width: '100%' }}>
        <Owl p={me} width={56} />
        <span>{me.owl_name} is carrying your letter to {p.name}.</span>
        <span className="small muted">Lands in {timeLeft(out[0].arrive_at)}. Tap to watch.</span>
      </button>
    );
  } else {
    hero = (
      <section className="stone stack center" style={{ padding: '22px 16px', gap: 8 }}>
        <p>Nothing in the air right now.</p>
        <p className="small muted">Write a letter, or drop a scrap in your pocket for {DAYS[f.mine.post_day]}.</p>
      </section>
    );
  }

  // the two of you on the map, with the owl if a letter is in the air
  // the two of you on the map, with every owl in the air between you, live
  const prog = (l: { sent_at: string; arrive_at: string }) => Math.max(0, Math.min(1, (now - new Date(l.sent_at).getTime()) / (new Date(l.arrive_at).getTime() - new Date(l.sent_at).getTime() || 1)));
  const flight = inc[0] ? { l: inc[0], out: false } : out[0] ? { l: out[0], out: true } : null;
  const owls = [
    ...out.map((l) => ({ t: prog(l), alt: `${me.owl_name} flying your letter to ${p.name}` })),
    ...inc.map((l) => ({ t: prog(l), back: true, alt: `${p.owl_name} flying a letter to you` }))
  ];
  const mapEl = me.last_lat != null && p.last_lat != null
    ? <FlightMap zoom from={[me.last_lat, me.last_lon!]} to={[p.last_lat, p.last_lon!]} fromLabel="You" toLabel={p.name} owls={owls} />
    : null;
  const mapCard = mapEl && (
    <div className="card stack map-card">
      {mapEl}
      <button className="row map-cap" onClick={() => flight && go(`flight/${flight.l.id}`)} disabled={!flight}>
        <span className="grow" style={{ fontWeight: 600 }}>{dist != null ? `${dist.toLocaleString()} km between you` : 'Between you'}</span>
        <span className="small muted">{flight ? 'Watch the flight' : 'as the crow flies'}</span>
      </button>
    </div>
  );

  return (
    <main className="app">
      <div className="top">
        <button className="icon" onClick={() => go('friends')} aria-label="Back">{Icon.back}</button>
        <Seal p={p} size={44} />
        <div className="grow">
          <div style={{ fontSize: 22, fontWeight: 600 }}>{p.name}</div>
          <div className="small muted">Writing to each other since {new Date(f.mine.since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      {hero}
      {mapCard}
      <div className="row" style={{ alignItems: 'stretch' }}>
        <button className="card grow stack" style={{ gap: 2, padding: 14, textAlign: 'left' }} onClick={() => go(`pocket/${p.id}`)}>
          <span className="small muted" style={{ fontStyle: 'italic' }}>In your pocket</span>
          <span style={{ fontSize: 20, fontWeight: 600 }}>{scrapCount} scrap{scrapCount === 1 ? '' : 's'}</span>
          <span className="small muted">Leaves {DAYS[f.mine.post_day]} evening</span>
        </button>
        {!mapCard && <div className="card grow stack" style={{ gap: 2, padding: 14 }}>
          <span className="small muted" style={{ fontStyle: 'italic' }}>Between you</span>
          <span style={{ fontSize: 20, fontWeight: 600 }}>{dist != null ? `${dist.toLocaleString()} km` : 'Unknown'}</span>
          <span className="small muted">as the crow flies</span>
        </div>}
      </div>
      <div className="card" style={{ padding: '2px 16px' }}>
        <label className="toggle">
          <span className="grow stack" style={{ gap: 0 }}>
            <span>Wish together at 11:11</span>
            <span className="small muted">{f.mine.wish_1111 && !f.theirs?.wish_1111 ? `Rings once ${p.name} turns it on too` : bothWish ? 'An alarm rings for you both' : 'An alarm rings for you both, morning and night'}</span>
          </span>
          <input type="checkbox" checked={f.mine.wish_1111} onChange={(e) => void saveFriendSettings(p.id, { wish_1111: e.target.checked })} />
        </label>
        <div className="row" style={{ minHeight: 56, borderTop: '1px solid var(--line)' }}>
          <span className="grow stack" style={{ gap: 0 }}>
            <span>{p.last_place ? `Last seen near ${p.last_place}` : 'Location not shared yet'}</span>
            <span className="small muted">Updated {ago(p.last_seen_at)}, when {p.name} last opened Signed</span>
          </span>
        </div>
      </div>
      <div className="foot">
        <button className="btn primary" onClick={() => go(`write/${p.id}`)}>Write a letter</button>
        <button className="btn" onClick={() => go(`pocket/${p.id}`)}>Drop a scrap</button>
      </div>
    </main>
  );
}
