import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { timeLeft } from '../lib/format';
import { km } from '../lib/geo';
import { Top } from '../components/bits';
import FlightMap from '../components/FlightMap';

/** Watch a letter fly, yours going out or a friend's coming in. */
export default function Flight({ id }: { id: string }) {
  const { me, letters, incoming, friend, session } = useStore();
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  const uid = session?.user.id;
  const l = letters.find((x) => x.id === id) ?? incoming.find((x) => x.id === id);
  if (!me || !l) return <main className="app"><Top title="In flight" back="friends" /><p className="muted">Looking for the owl…</p></main>;
  const outgoing = l.sender === uid;
  const otherId = outgoing ? (l as unknown as { recipient: string }).recipient : l.sender;
  const other = friend(otherId)?.profile;
  const name = other?.name ?? 'your friend';
  const owl = outgoing ? me.owl_name : other?.owl_name ?? 'Their owl';
  const t = Math.max(0, Math.min(1, (Date.now() - new Date(l.sent_at).getTime()) / (new Date(l.arrive_at).getTime() - new Date(l.sent_at).getTime() || 1)));
  // letters sent before someone shared a location borrow where the two of you are now
  const meAt: [number, number] | null = me.last_lat != null ? [me.last_lat, me.last_lon!] : null;
  const themAt: [number, number] | null = other?.last_lat != null ? [other.last_lat, other.last_lon!] : null;
  const fromAt: [number, number] | null = l.from_lat != null ? [l.from_lat, l.from_lon!] : outgoing ? meAt : themAt;
  const toAt: [number, number] | null = l.to_lat != null ? [l.to_lat, l.to_lon!] : outgoing ? themAt : meAt;
  const has = fromAt != null && toAt != null;
  // every owl in the air between the two of you, this one first; ones flying the other way face back
  const nowMs = Date.now();
  const progOf = (x: { sent_at: string; arrive_at: string }) => Math.max(0, Math.min(1, (nowMs - new Date(x.sent_at).getTime()) / (new Date(x.arrive_at).getTime() - new Date(x.sent_at).getTime() || 1)));
  const mineOut = letters.filter((x) => x.sender === uid && x.recipient === otherId && new Date(x.arrive_at).getTime() > nowMs).map((x) => ({ id: x.id, t: progOf(x), dirOut: true }));
  const theirsIn = incoming.filter((x) => x.sender === otherId && new Date(x.arrive_at).getTime() > nowMs).map((x) => ({ id: x.id, t: progOf(x), dirOut: false }));
  const pairOwls = [...mineOut, ...theirsIn].sort((a, b) => (a.id === id ? -1 : b.id === id ? 1 : 0))
    .map((o) => ({ t: o.t, back: o.dirOut !== outgoing, plume: o.dirOut ? me.plume : other?.plume, alt: o.dirOut ? `${me.owl_name} carrying your letter` : `${other?.owl_name ?? 'Their owl'} carrying a letter to you` }));
  if (!pairOwls.length) pairOwls.push({ t, back: false, plume: outgoing ? me.plume : other?.plume, alt: `${owl} in flight` });
  const dist = has ? Math.round(km(fromAt!, toAt!)) : null;
  const map = has ? (
    <FlightMap from={fromAt!} to={toAt!} fromLabel={outgoing ? 'You' : name} toLabel={outgoing ? name : 'You'} owls={pairOwls} />
  ) : null;

  return (
    <main className="app">
      <Top title="In flight" back={`friend/${otherId}`} />
      {map ?? (
        <div className="stone stack center" style={{ padding: 22 }}>
          <p>{has ? `${owl} is flying ${dist!.toLocaleString()} km, beyond the map we have drawn so far.` : `${owl} is on the way. Distance shows once you both share your location.`}</p>
        </div>
      )}
      <div className="stack" style={{ gap: 6 }}>
        <p style={{ fontSize: 20, fontWeight: 600 }}>{t >= 1 ? (outgoing ? 'Delivered' : 'Landed') : outgoing ? 'Your letter is on its way' : `A letter from ${name} is on its way`}</p>
        <p className="muted">{t >= 1 ? (outgoing ? `${owl} reached ${name}.` : `${owl} is waiting for you.`) : outgoing ? `${owl} reaches ${name} in ${timeLeft(l.arrive_at)}.` : `${owl} reaches you in ${timeLeft(l.arrive_at)}.`}</p>
        <div className="bar"><i style={{ width: `${t * 100}%` }} /></div>
        {dist != null && <p className="small muted">{dist.toLocaleString()} km as the crow flies. {owl} wanders a little, as owls do.</p>}
      </div>
      <div className="foot"><button className="btn" onClick={() => go(`friend/${otherId}`)}>Done</button></div>
    </main>
  );
}
