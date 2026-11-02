import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { timeLeft } from '../lib/format';
import { Owl, Seal } from './bits';

export interface Flight { id: string; friendId: string; out: boolean; sent_at: string; arrive_at: string }

/** Every letter flying right now, both ways, soonest first. */
export function useFlights(): Flight[] {
  const { letters, incoming, session } = useStore();
  const [, tick] = useState(0);
  useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 1000); return () => window.clearInterval(t); }, []);
  const uid = session?.user.id;
  const now = Date.now();
  const out = letters.filter((l) => l.sender === uid && new Date(l.arrive_at).getTime() > now)
    .map((l) => ({ id: l.id, friendId: l.recipient, out: true, sent_at: l.sent_at, arrive_at: l.arrive_at }));
  const inc = incoming.filter((l) => new Date(l.arrive_at).getTime() > now)
    .map((l) => ({ id: l.id, friendId: l.sender, out: false, sent_at: l.sent_at, arrive_at: l.arrive_at }));
  return [...out, ...inc].sort((a, b) => new Date(a.arrive_at).getTime() - new Date(b.arrive_at).getTime());
}

const progress = (f: Flight) => {
  const a = new Date(f.sent_at).getTime(), b = new Date(f.arrive_at).getTime();
  return Math.max(0, Math.min(1, (Date.now() - a) / (b - a || 1)));
};

/** A card per flight: who, which way, when it lands, and how far along the owl is. */
export default function InTheAir({ flights }: { flights: Flight[] }) {
  const { me, friend } = useStore();
  if (!me || flights.length === 0) return null;
  return (
    <ul className="list">
      {flights.map((f) => {
        const p = friend(f.friendId)?.profile;
        if (!p) return null;
        return (
          <li key={f.id}>
            <button className="item air" onClick={() => go(`flight/${f.id}`)}>
              <span className="air-owl"><Owl p={f.out ? me : p} width={34} /></span>
              <span className="grow stack" style={{ gap: 4 }}>
                <span className="row" style={{ gap: 8 }}>
                  <Seal p={p} size={22} />
                  <span style={{ fontWeight: 600 }}>{f.out ? `To ${p.name}` : `From ${p.name}`}</span>
                </span>
                <span className="small muted">{f.out ? `${me.owl_name} lands in ${timeLeft(f.arrive_at)}` : `${p.owl_name} reaches you in ${timeLeft(f.arrive_at)}`}</span>
                <span className="bar"><i style={{ width: `${progress(f) * 100}%`, background: f.out ? 'var(--wax)' : '#2F5D50' }} /></span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
