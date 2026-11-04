import { useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { Icon, Nav, Seal } from '../components/bits';
import { dayKey, lettersOn } from '../lib/days';

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
    const key = dayKey(new Date(year, month, d));
    const list = lettersOn(letters, uid, key);
    const people = list.map((l) => (l.sender === uid ? me : friend(l.sender)?.profile)).filter(Boolean);
    cells.push(
      <div key={d} className="day">
        {people.length ? (
          <button onClick={() => go(`read/${list[0].id}/seals/${key}`)} aria-label={list.length > 1 ? `${list.length} letters on the ${d}th` : `${people[0]!.name}, ${d}`} className="day-btn">
            {list.length > 1 ? <SealPair a={people[0]!} b={people[1] ?? people[0]!} size={40} /> : <Seal p={people[0]!} size={40} />}
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

/** Two seals, one tucked behind the other: more than one letter that day. */
export function SealPair({ a, b, size }: { a: Parameters<typeof Seal>[0]['p']; b: Parameters<typeof Seal>[0]['p']; size: number }) {
  return (
    <span className="seal-pair" style={{ width: size, height: size }}>
      <span className="back"><Seal p={b} size={size * 0.78} /></span>
      <span className="front"><Seal p={a} size={size * 0.78} /></span>
    </span>
  );
}
