import { useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { longDate } from '../lib/format';
import type { CustomStamp } from '../lib/types';
import { CutStamp, Icon, Nav, Seal, Stamp, STAMP_GROUPS, STAMP_NAMES, BUILT_IN_STAMPS } from '../components/bits';

/** Your stamp album: stamps you have cut and can send, Signed's own stamps (the post office), and stamps friends sent you. */
export default function Stamps() {
  const { stamps, friend, session, say, refresh } = useStore();
  const uid = session!.user.id;
  const [open, setOpen] = useState<CustomStamp | null>(null);
  const [office, setOffice] = useState<string | null>(null);
  const yours = stamps.filter((s) => s.owner === uid && s.status === 'mine');
  const collected = stamps.filter((s) => s.owner === uid && s.status === 'collected');

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
        <div className="stack" style={{ gap: 2 }}>
          <div className="row"><h2 className="grow">Ready to send</h2><span className="small muted">{yours.length}</span></div>
          <p className="small muted">Stamps you cut. Each one goes out on a single letter, then it’s gone.</p>
        </div>
        {yours.length > 0 && <div className="album">{yours.map((s, i) => (
              <button key={s.id} className="album-slot" style={{ transform: `rotate(${((i % 5) - 2) * 1.2}deg)` }} onClick={() => setOpen(s)} aria-label={s.caption || 'Stamp'}>
                <CutStamp s={s} size={s.cutter === 'wide' ? 96 : 78} />
              </button>
            ))}</div>}
      </section>

      <section className="stack post-office">
        <div className="stack" style={{ gap: 2 }}>
          <div className="row"><h2 className="grow">The post office</h2><span className="small muted">{BUILT_IN_STAMPS.length}</span></div>
          <p className="small muted">Signed’s own stamps. They never run out.</p>
        </div>
        {STAMP_GROUPS.map((g) => (
          <div key={g.name} className="stack" style={{ gap: 8 }}>
            <p className="office-group">{g.name}</p>
            <div className="album">{g.keys.map((k, i) => (
              <button key={k} className="album-slot" style={{ transform: `rotate(${((i % 5) - 2) * 1.2}deg)` }} onClick={() => setOffice(k)} aria-label={STAMP_NAMES[k]}>
                <Stamp id={k} size={78} />
              </button>
            ))}</div>
          </div>
        ))}
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
      {office && (
        <div className="sheet-back" onClick={() => setOffice(null)}>
          <div className="stamp-sheet stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Stamp">
            <div className="row" style={{ justifyContent: 'center', padding: '8px 0 4px' }}><Stamp id={office} size={200} /></div>
            <div className="center stack" style={{ gap: 2 }}>
              <span style={{ fontSize: 20, fontStyle: 'italic' }}>{office === 'clock' ? 'Written at' : STAMP_NAMES[office]}</span>
              <span className="small muted">{office === 'moon' ? 'Shows the moon on the night you send it.' : office === 'sky' ? 'Shows the sky of the hour you send it.' : office === 'clock' ? 'Shows the minute you seal the letter.' : 'Pick it when you seal a letter. It never runs out.'}</span>
            </div>
            <button className="btn primary" onClick={() => setOffice(null)}>Done</button>
          </div>
        </div>
      )}
      <Nav on="stamps" />
    </main>
  );
}
