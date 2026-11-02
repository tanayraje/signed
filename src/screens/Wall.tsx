import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { longDate } from '../lib/format';
import { CutStamp, MediaImg, Nav, Seal } from '../components/bits';

const TACKS = ['#8E231C', '#2C3A68', '#A9761E', '#2F5D50'];

export default function Wall() {
  const { letters, friend, session, stamps } = useStore();
  const uid = session!.user.id;
  const received = letters.filter((l) => l.recipient === uid && l.opened_at);
  const pinned = received.filter((l) => l.place === 'wall');
  const trunk = received.filter((l) => l.place !== 'wall');

  return (
    <main className="app">
      <div className="top"><h1 className="grow">Your wall</h1></div>
      <div className="wall">
        {pinned.length === 0 && <p className="muted center" style={{ gridColumn: '1 / -1', padding: '40px 0' }}>Pin a letter from its reading view and it lands here.</p>}
        {pinned.map((l, i) => {
          const f = friend(l.sender)?.profile;
          return (
            <button key={l.id} className="pinned" style={{ transform: `rotate(${((i % 3) - 1) * 3}deg)` }} onClick={() => go(`read/${l.id}`)}>
              <span className="tack" style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.5), ${TACKS[i % 4]} 70%)` }} />
              {l.photo_path ? (
                <figure className="polaroid" style={{ width: '100%' }}><MediaImg path={l.photo_path} alt={l.photo_caption || 'Polaroid'} /><figcaption>{l.photo_caption}</figcaption></figure>
              ) : (
                <div className="mini" style={{ minHeight: 110 }}>
                  {(l.body || (l.scraps?.[0]?.text ?? '')).slice(0, 90)}…
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
          <ul className="list">
            {trunk.map((l) => {
              const f = friend(l.sender)?.profile;
              return (
                <li key={l.id}>
                  <button className="item" onClick={() => go(`read/${l.id}`)}>
                    {f && <Seal p={f} size={36} />}
                    <span className="grow">{f?.name ?? 'A friend'}{l.kind === 'bundle' ? ', a bundle of scraps' : ''}</span>
                    <span className="small muted">{longDate(l.sent_at)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <Nav on="wall" />
    </main>
  );
}
