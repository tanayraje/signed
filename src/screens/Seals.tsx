import { useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { Icon, Nav, Seal } from '../components/bits';

export default function Seals() {
  const { me, letters, friend, session } = useStore();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  if (!me) return null;
  const uid = session!.user.id;
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const shift = (d: number) => { const t = new Date(year, month + d, 1); setMonth(t.getMonth()); setYear(t.getFullYear()); };
  const label = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<div key={`b${i}`} />);
  for (let d = 1; d <= days; d++) {
    const a = new Date(year, month, d).getTime(), b = a + 86400000;
    // Your seals on days you sent; a friend's seal on days you opened theirs.
    const l = letters.find((x) => (x.sender === uid ? new Date(x.sent_at).getTime() : x.opened_at ? new Date(x.opened_at).getTime() : -1) >= a
      && (x.sender === uid ? new Date(x.sent_at).getTime() : x.opened_at ? new Date(x.opened_at).getTime() : Infinity) < b);
    const who = l ? (l.sender === uid ? me : friend(l.sender)?.profile) : undefined;
    cells.push(
      <div key={d} className="day">
        {who ? (
          <button onClick={() => go(`read/${l!.id}/seals`)} aria-label={`${who.name}, ${d}`} style={{ border: 0, background: 'none', padding: 0, position: 'absolute', inset: 0 }}>
            <Seal p={who} size={40} />
          </button>
        ) : d}
      </div>
    );
  }

  return (
    <main className="app">
      <div className="top">
        <button className="icon" onClick={() => go('wall')} aria-label="Back to your wall">{Icon.back}</button>
        <h1 className="grow">Seal calendar</h1>
      </div>
      <div className="row">
        <button className="icon" onClick={() => shift(-1)} aria-label="Previous month">{Icon.back}</button>
        <span className="grow center" style={{ fontWeight: 600 }}>{label}</span>
        <button className="icon" onClick={() => shift(1)} aria-label="Next month" style={{ transform: 'scaleX(-1)' }}>{Icon.back}</button>
      </div>
      <div className="card" style={{ padding: 12 }}>
        <div className="cal">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => <div key={i} className="dow">{x}</div>)}
          {cells}
        </div>
      </div>
      <p className="small muted">Each seal marks a day a letter was shared. Tap one to read it again.</p>
      <Nav />
    </main>
  );
}
