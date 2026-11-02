import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { DAYS, randomQuestion } from '../lib/format';
import { shrinkImage, upload } from '../lib/media';
import type { Scrap } from '../lib/types';
import { Icon, MediaImg, Top } from '../components/bits';

export default function Pocket({ id }: { id: string }) {
  const { friend, session, say, saveFriendSettings, refresh } = useStore();
  const [scraps, setScraps] = useState<Scrap[]>([]);
  const [line, setLine] = useState('');
  const [busy, setBusy] = useState(false);
  const uid = session!.user.id;
  const f = friend(id);

  const load = useCallback(async () => {
    const { data } = await supabase.from('scraps').select('*').eq('owner', uid).eq('friend', id).order('created_at');
    setScraps((data ?? []) as Scrap[]);
  }, [uid, id]);
  useEffect(() => { void load(); }, [load]);
  if (!f) return null;
  const p = f.profile;

  async function add(s: Omit<Scrap, 'id'>) {
    const { error } = await supabase.from('scraps').insert({ ...s, owner: uid, friend: id });
    if (error) say('That scrap did not save. Try again.');
    await load();
  }

  async function remove(s: Scrap) {
    setScraps((all) => all.filter((x) => x.id !== s.id));
    const { error } = await supabase.from('scraps').delete().eq('id', s.id);
    if (error) { say('Could not take it out. Try again.'); await load(); return; }
    if (s.media_path) void supabase.storage.from('mail').remove([s.media_path]);
    say('Taken out of your pocket.');
  }

  return (
    <main className="app">
      <Top title={`Pocket for ${p.name}`} back={`friend/${id}`} />
      <p className="muted">Little things from your week. They wait here and leave together on post day.</p>
      <div className="stone" style={{ padding: '18px 14px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'center', minHeight: 200 }}>
        {scraps.length === 0 && <p className="muted center" style={{ width: '100%', padding: '30px 0' }}>Your pocket is empty. Drop in a line, a photo or a question as the week goes.</p>}
        {scraps.map((s, i) => {
          const tilt = ((i % 3) - 1) * 3;
          const body = s.type === 'photo' && s.media_path
            ? <figure className="polaroid" style={{ width: '100%' }}><MediaImg path={s.media_path} alt="Photo scrap" /><figcaption>{s.text}</figcaption></figure>
            : s.type === 'question'
              ? <div className="qcard"><small>A question for {p.name}</small>{s.text}</div>
              : <div className="mini">{s.text}</div>;
          return (
            <div key={s.id} className="scrap" style={{ width: s.type === 'photo' ? '46%' : '62%', transform: `rotate(${tilt}deg)` }}>
              {body}
              <button className="scrap-x" onClick={() => void remove(s)} aria-label="Take this scrap out">{Icon.close}</button>
            </div>
          );
        })}
      </div>
      <div className="card stack" style={{ padding: '12px 14px', gap: 10 }}>
        <label htmlFor="scrapText" className="small muted" style={{ fontStyle: 'italic' }}>Add a line</label>
        <textarea id="scrapText" rows={2} value={line} onChange={(e) => setLine(e.target.value)} placeholder="Something that happened today" />
        <div className="chips">
          <button className="chip" disabled={!line.trim()} onClick={async () => { await add({ type: 'line', text: line.trim(), media_path: null }); setLine(''); }}>Add line</button>
          <label className="chip" htmlFor="scrapPhoto">{busy ? 'Adding…' : 'Add photo'}</label>
          <input id="scrapPhoto" type="file" accept="image/*" hidden onChange={async (e) => {
            const file = e.target.files?.[0]; if (!file) return;
            setBusy(true);
            try { const path = await upload(uid, await shrinkImage(file), 'jpg'); await add({ type: 'photo', text: line.trim().slice(0, 28) || null, media_path: path }); setLine(''); }
            catch (err) { say((err as Error).message); }
            setBusy(false); e.target.value = '';
          }} />
          <button className="chip" onClick={() => add({ type: 'question', text: randomQuestion(), media_path: null })}>Add a question</button>
        </div>
      </div>
      <div className="card" style={{ padding: '2px 16px' }}>
        <label className="toggle">
          <span className="grow">Post day</span>
          <select value={f.mine.post_day} style={{ width: 'auto' }} onChange={(e) => void saveFriendSettings(id, { post_day: Number(e.target.value) })}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </label>
        <label className="toggle" style={{ borderTop: '1px solid var(--line)' }}>
          <span className="grow">Send on post day, even if it's small</span>
          <input type="checkbox" checked={f.mine.auto_post} onChange={(e) => void saveFriendSettings(id, { auto_post: e.target.checked })} />
        </label>
      </div>
      <div className="foot">
        <button className="btn" disabled={!scraps.length} onClick={() => { say(`Saved. Your scraps leave ${DAYS[f.mine.post_day]} evening.`); go(`friend/${id}`); }}>Save for {DAYS[f.mine.post_day]}</button>
        <button className="btn primary" disabled={!scraps.length} onClick={async () => {
          const { data, error } = await supabase.rpc('send_pocket', { friend_id: id });
          if (error) { say('Could not send the bundle. Try again.'); return; }
          await refresh();
          go(`flight/${data as string}`);
        }}>Send now</button>
      </div>
    </main>
  );
}
