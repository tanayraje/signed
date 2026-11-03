import { useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { Seal } from './bits';

const QUILL = (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M20.6 3.2c-5.6.4-10.2 4-12.4 9.7-.6 1.6-1 3.2-1.2 4.8l1.5-1.2c2-.4 4-1.3 5.7-2.9-1.3.1-2.4 0-3.3-.3 1.7-.2 3.3-.8 4.7-1.9-1 0-1.9-.1-2.7-.4 1.7-.5 3.1-1.4 4.3-2.7.9-1.2 2.1-3 3.4-5.1z" fill="currentColor" />
    <path d="M7.4 17.1L3.6 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** One way to start a letter from home: straight in with one friend, a quick pick with more. */
export default function WriteButton() {
  const { friends, say } = useStore();
  const [picking, setPicking] = useState(false);
  function start() {
    if (friends.length === 0) { say('Invite a friend first, then you can write.'); go('friends'); return; }
    if (friends.length === 1) { go(`write/${friends[0].profile.id}`); return; }
    setPicking(true);
  }
  return (
    <>
      <button className="write-fab" onClick={start}>{QUILL}<span>Write</span></button>
      {picking && (
        <div className="sheet-back" onClick={() => setPicking(false)}>
          <div className="stamp-sheet stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Write to">
            <h2 style={{ fontSize: 18 }}>Write to</h2>
            <div className="write-pick">
              {friends.map(({ profile: p }) => (
                <button key={p.id} onClick={() => go(`write/${p.id}`)}><Seal p={p} size={54} /><span>{p.name}</span></button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
