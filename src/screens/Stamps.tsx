import { useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { longDate } from '../lib/format';
import type { CustomStamp } from '../lib/types';
import { CutStamp, Icon, Nav, Seal } from '../components/bits';

/** Your stamp album: stamps you have cut and can send, and stamps friends sent you. */
export default function Stamps() {
  const { stamps, friend, session, say, refresh } = useStore();
  const uid = session!.user.id;
  const [open, setOpen] = useState<CustomStamp | null>(null);
  const yours = stamps.filter((s) => s.owner === uid && s.status === 'mine');
  const collected = stamps.filter((s) => s.owner === uid && s.status === 'collected');
  const flying = stamps.filter((s) => s.made_by === uid && s.owner !== uid);

  // collected stamps, grouped by who sent them
  const groups = new Map<string, CustomStamp[]>();
  for (const s of collected) { const k = s.from_user ?? '?'; groups.set(k, [...(groups.get(k) ?? []), s]); }

  async function throwAway(s: CustomStamp) {
    const { error } = await supabase.from('stamps').delete().eq('id', s.id);
    if (error) { say('Could not throw it away. Try again.'); return; }
    await supabase.storage.from('mail').remove([s.image_path]);
    setOpen(null); await refresh(); say('Thrown away.');
  }

  return (
    <main className="app">
      <div className="top"><h1 className="grow">Stamps</h1></div>

      <button className="cut-cta" onClick={() => go('cutter')}>
        <span className="cut-cta-icon">{Icon.camera}</span>
        <span className="grow stack" style={{ gap: 0, textAlign: 'left' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>Cut a stamp</span>
          <span className="small muted">Point the cutter at anything and press.</span>
        </span>
      </button>

      <section className="stack">
        <div className="row"><h2 className="grow">Ready to send</h2><span className="small muted">{yours.length}</span></div>
        {yours.length === 0
          ? <p className="small muted">Stamps you cut wait here. Each one can go out on one letter.</p>
          : <div className="album">{yours.map((s, i) => (
              <button key={s.id} className="album-slot" style={{ transform: `rotate(${((i % 5) - 2) * 1.2}deg)` }} onClick={() => setOpen(s)} aria-label={s.caption || 'Stamp'}>
                <CutStamp s={s} size={s.cutter === 'wide' ? 96 : 78} />
              </button>
            ))}</div>}
        {flying.length > 0 && <p className="small muted">{flying.length} {flying.length === 1 ? 'stamp is' : 'stamps are'} flying to friends.</p>}
      </section>

      <section className="stack">
        <div className="row"><h2 className="grow">Collected from friends</h2><span className="small muted">{collected.length}</span></div>
        {collected.length === 0 && <p className="small muted">When a friend’s letter arrives with a stamp they cut, it’s yours to keep, postmarked from where they sent it.</p>}
        {[...groups.entries()].map(([fid, list]) => {
          const f = friend(fid)?.profile;
          return (
            <div key={fid} className="stone stack" style={{ padding: '14px 14px 16px', gap: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                {f && <Seal p={f} size={30} />}
                <span className="grow" style={{ fontWeight: 600 }}>From {f?.name ?? 'a friend'}</span>
                <span className="small muted">{list.length}</span>
              </div>
              <div className="album">{list.map((s, i) => (
                <button key={s.id} className="album-slot" style={{ transform: `rotate(${((i % 5) - 2) * 1.4}deg)` }} onClick={() => setOpen(s)} aria-label={s.caption || 'Stamp'}>
                  <CutStamp s={s} size={s.cutter === 'wide' ? 96 : 78} />
                </button>
              ))}</div>
            </div>
          );
        })}
      </section>

      {open && (
        <div className="sheet-back" onClick={() => setOpen(null)}>
          <div className="stamp-sheet stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Stamp">
            <div className="row" style={{ justifyContent: 'center', padding: '8px 0 4px' }}><CutStamp s={open} size={open.cutter === 'wide' ? 250 : 200} /></div>
            <div className="center stack" style={{ gap: 2 }}>
              {open.caption && <span style={{ fontSize: 20, fontStyle: 'italic' }}>{open.caption}</span>}
              <span className="small muted">
                {open.status === 'collected'
                  ? `From ${friend(open.from_user ?? '')?.profile.name ?? 'a friend'}${open.postmark_place ? `, posted near ${open.postmark_place}` : ''}, ${longDate(open.postmark_at ?? open.created_at)}`
                  : `Cut ${longDate(open.created_at)}. Pick it when you seal a letter.`}
              </span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              {open.status === 'mine' && <button className="btn" style={{ flex: 1 }} onClick={() => void throwAway(open)}>Throw away</button>}
              <button className="btn primary" style={{ flex: 1 }} onClick={() => setOpen(null)}>Done</button>
            </div>
          </div>
        </div>
      )}
      <Nav on="stamps" />
    </main>
  );
}
