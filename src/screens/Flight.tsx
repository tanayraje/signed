import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { timeLeft } from '../lib/format';
import { km } from '../lib/geo';
import { Icon, Owl } from '../components/bits';
import FlightMap, { type MapOwl } from '../components/FlightMap';

/** A letter's flight opens the map between the two of you, that letter first. */
export default function Flight({ id }: { id: string }) {
  const { letters, incoming, session } = useStore();
  const l = letters.find((x) => x.id === id) ?? incoming.find((x) => x.id === id);
  if (!l) return <PairMap friendId="" />;
  const other = l.sender === session?.user.id ? (l as unknown as { recipient: string }).recipient : l.sender;
  return <PairMap friendId={other} focus={id} />;
}

/** The full map between you and one friend: every owl in the air, live, with smooth pan and pinch. */
export function PairMap({ friendId, focus }: { friendId: string; focus?: string }) {
  const { me, letters, incoming, friend, session } = useStore();
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  const f = friend(friendId);
  if (!me || !f) return <main className="app"><p className="muted">Looking for the owl…</p></main>;
  const p = f.profile;
  const uid = session!.user.id;
  const now = Date.now();
  const prog = (x: { sent_at: string; arrive_at: string }) => Math.max(0, Math.min(1, (now - new Date(x.sent_at).getTime()) / (new Date(x.arrive_at).getTime() - new Date(x.sent_at).getTime() || 1)));

  const out = letters.filter((x) => x.sender === uid && x.recipient === friendId && new Date(x.arrive_at).getTime() > now);
  const inc = incoming.filter((x) => x.sender === friendId && new Date(x.arrive_at).getTime() > now);
  const all = [
    ...out.map((x) => ({ id: x.id, arrive: x.arrive_at, t: prog(x), out: true })),
    ...inc.map((x) => ({ id: x.id, arrive: x.arrive_at, t: prog(x), out: false }))
  ].sort((a, b) => (a.id === focus ? -1 : b.id === focus ? 1 : a.arrive.localeCompare(b.arrive)));
  const owls: MapOwl[] = all.map((o) => ({ t: o.t, back: !o.out, plume: o.out ? me.plume : p.plume, alt: o.out ? `${me.owl_name} carrying your letter` : `${p.owl_name} carrying a letter to you` }));

  const has = me.last_lat != null && p.last_lat != null;
  const dist = has ? Math.round(km([me.last_lat!, me.last_lon!], [p.last_lat!, p.last_lon!])) : null;

  return (
    <div className="mapview">
      <div className="mapview-top">
        <button className="icon" onClick={() => go(`friend/${friendId}`)} aria-label="Back">{Icon.back}</button>
        <div className="grow stack" style={{ gap: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 18 }}>You and {p.name}</span>
          <span className="small muted">{dist != null ? `${dist.toLocaleString()} km apart, as the crow flies` : 'Share your locations to see the map'}</span>
        </div>
      </div>
      <div className="mapview-map">
        {has
          ? <FlightMap interactive from={[me.last_lat!, me.last_lon!]} to={[p.last_lat!, p.last_lon!]} fromLabel="You" toLabel={p.name} owls={owls} />
          : <p className="muted center" style={{ padding: 30 }}>The map appears once you both open Signed with location allowed.</p>}
      </div>
      <div className="mapview-list">
        {all.length === 0 && <p className="small muted center" style={{ margin: 0 }}>No owls in the air right now. Pinch to explore the map.</p>}
        {all.map((o) => (
          <div key={o.id} className={`mapview-row${o.id === focus ? ' on' : ''}`}>
            <Owl p={o.out ? me : p} width={30} />
            <span className="grow stack" style={{ gap: 3 }}>
              <span>{o.out ? `${me.owl_name} → ${p.name}` : `${p.owl_name} → you`}<span className="small muted"> · lands in {timeLeft(o.arrive)}</span></span>
              <span className="bar"><i style={{ width: `${o.t * 100}%`, background: o.out ? 'var(--wax)' : '#2F5D50' }} /></span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
