import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { longDate } from '../lib/format';
import { CutStamp, MediaImg, Nav, Owl, Seal, Wordmark } from '../components/bits';
import { useFlights } from '../components/InTheAir';
import { timeLeft } from '../lib/format';
import { dayKey, lettersOn } from '../lib/days';
import { SealPair } from './Seals';

const TACKS = ['#8E231C', '#2C3A68', '#A9761E', '#2F5D50'];

export default function Wall() {
  const { letters, friend, session, stamps, pins } = useStore();
  const uid = session!.user.id;
  const received = letters.filter((l) => l.recipient === uid && l.opened_at);
  const pinned = received.filter((l) => l.place === 'wall');
  const trunk = received.filter((l) => l.place !== 'wall');

  return (
    <main className="app">
      <div className="top wall-head">
        <h1 className="sr-only">Your wall</h1>
        <Wordmark size={50} />
        <span className="grow" />
        <span className="wall-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>
      <SealWeek />
      <WallCallouts />
      <div className="wall">
        {pinned.length === 0 && pins.length === 0 && <p className="muted center" style={{ gridColumn: '1 / -1', padding: '40px 0' }}>Pin a letter, or just its Polaroid, from its reading view and it lands here.</p>}
        {[
          ...pins.map((p) => ({ key: `p-${p.id}`, at: p.created_at, letter: p.letter_id, photo: p })),
          ...pinned.map((l) => ({ key: `l-${l.id}`, at: l.opened_at ?? l.sent_at, letter: l.id, photo: null as null | typeof pins[number] }))
        ].sort((a, b) => b.at.localeCompare(a.at)).map((it, i) => {
          const l = letters.find((x) => x.id === it.letter);
          const f = l ? friend(l.sender)?.profile : undefined;
          return (
            <button key={it.key} className="pinned" style={{ transform: `rotate(${((i % 3) - 1) * 3}deg)` }} onClick={() => go(`read/${it.letter}/wall`)}>
              <span className="tack" style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.5), ${TACKS[i % 4]} 70%)` }} />
              {it.photo ? (
                <figure className="polaroid" style={{ width: '100%' }}><MediaImg path={it.photo.media_path} alt={it.photo.caption || 'Polaroid'} /><figcaption>{it.photo.caption}</figcaption></figure>
              ) : (
                <div className="mini" style={{ minHeight: 110 }}>
                  {(l?.body || (l?.scraps?.find((s) => s.text)?.text ?? '')).slice(0, 90)}…
                  <div style={{ fontFamily: 'var(--sign)', fontSize: 30, textAlign: 'right', color: '#1F2A44', fontStyle: 'normal' }}>{f?.name}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <section className="stack">
        <h2>In the trunk</h2>
        {(() => {
          const got = stamps.filter((s) => s.owner === uid && s.status === 'collected');
          if (!got.length) return null;
          return (
            <button className="item card" style={{ padding: '10px 14px' }} onClick={() => go('stamps')}>
              <span className="trunk-stamps">{got.slice(0, 4).map((s) => <CutStamp key={s.id} s={s} size={30} postmark={false} />)}</span>
              <span className="grow">{got.length} {got.length === 1 ? 'stamp' : 'stamps'} collected from friends</span>
            </button>
          );
        })()}
        {trunk.length === 0 ? <p className="small muted">Letters you fold away live here.</p> : (
          <div className="stack" style={{ gap: 10 }}>
            {[...trunk.reduce((m, l) => m.set(l.sender, [...(m.get(l.sender) ?? []), l]), new Map<string, typeof trunk>()).entries()]
              .sort((a, b) => b[1][0].sent_at.localeCompare(a[1][0].sent_at))
              .map(([sender, list]) => {
                const f = friend(sender)?.profile;
                return (
                  <details key={sender} className="trunk-group">
                    <summary>
                      {f && <Seal p={f} size={38} />}
                      <span className="grow stack" style={{ gap: 0 }}>
                        <span style={{ fontWeight: 600 }}>{f?.name ?? 'A friend'}</span>
                        <span className="small muted">{list.length} {list.length === 1 ? 'letter' : 'letters'}, latest {longDate(list[0].sent_at)}</span>
                      </span>
                      <span className="trunk-chev" aria-hidden="true">›</span>
                    </summary>
                    <ul className="trunk-letters">
                      {list.map((l) => (
                        <li key={l.id}>
                          <button onClick={() => go(`read/${l.id}/wall`)}>
                            <span className="grow trunk-snip">{l.kind === 'bundle' ? 'A bundle of scraps' : (l.body || (l.audio_path ? 'A howler' : l.video_path ? 'A moving picture' : 'A letter')).slice(0, 60)}</span>
                            <span className="small muted">{longDate(l.sent_at)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
          </div>
        )}
      </section>
      <Nav on="wall" />
    </main>
  );
}

/** On the way home: letters waiting to be opened, then anything still in the air. */
function WallCallouts() {
  const { me, letters, friend, session } = useStore();
  const flights = useFlights();
  if (!me) return null;
  const uid = session!.user.id;
  const now = Date.now();
  const waiting = letters.filter((l) => l.recipient === uid && !l.opened_at && new Date(l.arrive_at).getTime() <= now);
  if (!waiting.length && !flights.length) return null;
  const next = flights[0];
  const nf = next ? friend(next.friendId)?.profile : undefined;
  return (
    <div className="stack" style={{ gap: 10 }}>
      {waiting.map((l) => {
        const p = friend(l.sender)?.profile;
        if (!p) return null;
        return (
          <button key={l.id} className="callout landed" onClick={() => go(`open/${l.id}`)}>
            <Owl p={p} width={36} />
            <span className="grow stack" style={{ gap: 0 }}><span style={{ fontWeight: 600 }}>A letter from {p.name} has landed</span><span className="small">{p.owl_name} is waiting. Tap to lift the seal.</span></span>
            <Seal p={p} size={34} />
          </button>
        );
      })}
      {next && nf && (
        <button className="callout" onClick={() => go('friends')}>
          <Owl p={next.out ? me : nf} width={36} />
          <span className="grow stack" style={{ gap: 0 }}>
            <span style={{ fontWeight: 600 }}>{flights.length === 1 ? (next.out ? `Your letter to ${nf.name} is in the air` : `${nf.name}’s letter is in the air`) : `${flights.length} letters in the air`}</span>
            <span className="small muted">{next.out ? `Lands with ${nf.name}` : 'Reaches you'} in {timeLeft(next.arrive_at)}{flights.length > 1 ? ', the next one' : ''}</span>
          </span>
        </button>
      )}
    </div>
  );
}

/** The last seven days as seals; tap for the whole calendar. */
function SealWeek() {
  const { me, letters, friend, session } = useStore();
  if (!me) return null;
  const uid = session!.user.id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * 86400000));
  const when = (l: typeof letters[number]) => l.sender === uid ? new Date(l.sent_at).getTime() : l.opened_at ? new Date(l.opened_at).getTime() : -1;
  const month = letters.filter((l) => { const t = when(l); return t >= new Date(today.getFullYear(), today.getMonth(), 1).getTime(); }).length;
  return (
    <button className="sealweek" onClick={() => go('seals')} aria-label="Open your seal calendar">
      <span className="sealweek-days">
        {days.map((d) => {
          const a = d.getTime(), list = lettersOn(letters, uid, dayKey(d));
          const people = list.map((x) => (x.sender === uid ? me : friend(x.sender)?.profile)).filter(Boolean);
          return (
            <span key={a} className="sealweek-day">
              <small>{'SMTWTFS'[d.getDay()]}</small>
              {people.length > 1 ? <SealPair a={people[0]!} b={people[1]!} size={28} /> : people.length ? <Seal p={people[0]!} size={26} /> : <i />}
            </span>
          );
        })}
      </span>
      <span className="sealweek-more"><b>{month}</b><small>{month === 1 ? 'letter' : 'letters'} this month</small></span>
    </button>
  );
}
