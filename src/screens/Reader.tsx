import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { longDate } from '../lib/format';
import { Icon, Polaroid, Stamp, useSigned } from '../components/bits';
import type { Letter } from '../lib/types';
import { toAnswer, toggleAnswer } from '../lib/answers';

/** `from` is the page the letter was opened from (wall, seals); closing goes back there. */
export default function Reader({ id, from }: { id: string; from?: string }) {
  const { me, letters, friend, session, refresh, say, stamps, pins } = useStore();
  const [peek, setPeek] = useState(false);
  const [, bump] = useState(0);
  const l = letters.find((x) => x.id === id);
  if (!me || !l) return null;
  const uid = session!.user.id;
  const fromMe = l.sender === uid;
  const other = friend(fromMe ? l.recipient : l.sender)?.profile;
  if (!other) return null;
  const author = fromMe ? me : other;

  const picked = new Set(toAnswer(other.id).map((x) => x.key));
  const answeredHere = new Set(letters.filter((x) => x.sender === uid && x.recipient === other.id).flatMap((x) => (x.answers ?? []).map((a) => `${a.letter_id}:${a.question}`)));
  function QCard({ label, q, k, tilt = 0 }: { label: string; q: string; k: string; tilt?: number }) {
    const on = picked.has(k);
    const done = answeredHere.has(`${l!.id}:${q}`);
    return (
      <div className="qcard" style={{ transform: `rotate(${tilt}deg)`, width: '86%' }}>
        <small>{label}</small>{q}
        {!fromMe && (
          done ? <span className="q-done">You answered this</span> : (
            <button className={`q-answer${on ? ' on' : ''}`} aria-pressed={on} onClick={() => {
              const now = toggleAnswer(other!.id, { key: k, question: q, letter_id: l!.id });
              say(now ? `It’ll be waiting in your next letter to ${other!.name}.` : 'Taken off your list.'); bump((n) => n + 1);
            }}>{on ? '✓ Answering in my reply' : 'Answer this'}</button>
          )
        )}
      </div>
    );
  }

  function PinPhoto({ path, caption }: { path: string; caption?: string | null }) {
    if (fromMe) return null;
    const pin = pins.find((x) => x.media_path === path);
    return (
      <button className={`pin-photo${pin ? ' on' : ''}`} onClick={async () => {
        if (pin) { await supabase.from('wall_pins').delete().eq('id', pin.id); await refresh(); say('Taken off your wall.'); return; }
        const { error } = await supabase.from('wall_pins').insert({ letter_id: l!.id, media_path: path, caption: caption ?? null });
        if (error) { say('Could not pin it. Try again.'); return; }
        await refresh(); say('Polaroid pinned to your wall.');
      }}>{pin ? '✓ On your wall' : 'Pin this photo'}</button>
    );
  }

  async function file(where: 'wall' | 'trunk') {
    await supabase.rpc('file_letter', { letter_id: l!.id, where_to: where });
    await refresh();
    say(where === 'wall' ? 'Pinned to your wall.' : 'Folded into the trunk.');
  }

  return (
    <div className="slate">
      <main className="app">
        <div className="top">
          <button className="icon" onClick={() => go(from === 'wall' || from === 'seals' ? from : `friend/${other.id}`)} aria-label="Close letter">{Icon.close}</button>
          <span className="grow muted">{fromMe ? `To ${other.name}` : `From ${other.name}`}, {longDate(l.sent_at)}</span>
        </div>
        <article className={`sheet unfold stack${l.enchanted ? ' parch' : ''}`} style={{ gap: 16, minHeight: '60vh' }}>
          <div className="crease" style={{ top: '33%' }} />
          <div className="crease" style={{ top: '66%' }} />
          {l.video_path && <Video path={l.video_path} />}
          {l.audio_path ? <TalkingBody letter={l} /> : l.body && <div className="body selectable">{l.body}</div>}
          {(l.scraps ?? []).map((s, i) =>
            s.type === 'photo' && s.media_path ? <div key={i} className="stack" style={{ width: '55%', gap: 8 }}><Polaroid path={s.media_path} caption={s.text} width="100%" tilt={((i % 3) - 1) * 3} /><PinPhoto path={s.media_path} caption={s.text} /></div>
              : s.type === 'question' ? <QCard key={i} label={fromMe ? 'You asked' : `${other.name} asks you`} q={s.text ?? ''} k={`${l.id}:${i}`} />
                : <p key={i} style={{ fontStyle: 'italic', borderBottom: '1px dashed #D9CDB9', paddingBottom: 8 }}>{s.text}</p>
          )}
          {l.photo_path && <div className="stack" style={{ marginLeft: 'auto', width: '58%', gap: 8 }}><Polaroid path={l.photo_path} caption={l.photo_caption} width="100%" tilt={4} /><PinPhoto path={l.photo_path} caption={l.photo_caption} /></div>}
          {l.question && <QCard label={fromMe ? 'You asked' : `${other.name} asks you`} q={l.question} k={`${l.id}:q`} tilt={-2} />}
          {(l.answers ?? []).length > 0 && (
            <div className="stack" style={{ gap: 10 }}>
              {l.answers!.map((a, i) => (
                <div key={i} className="answer">
                  <small>{fromMe ? `${other.name} asked` : 'You asked'}</small>
                  <span className="answer-q">{a.question}</span>
                  <span className="answer-a selectable">{a.answer}</span>
                </div>
              ))}
            </div>
          )}
          <div className="spacer" />
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <button className="stamp-tap" onClick={() => setPeek(true)} aria-label="Look at the stamp"><Stamp id={l.stamp} size={58} /></button>
            <div className="grow" style={{ textAlign: 'right' }}>
              <div style={{ fontStyle: 'italic' }}>yours,</div>
              <div className="sig">{author.name}</div>
            </div>
          </div>
        </article>
        {peek && (() => {
          const cs = l.stamp.startsWith('custom:') ? stamps.find((s) => `custom:${s.id}` === l.stamp) : undefined;
          return (
            <div className="sheet-back" onClick={() => setPeek(false)}>
              <div className="stamp-sheet stack" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Stamp" style={{ color: '#2B2622' }}>
                <div className="row" style={{ justifyContent: 'center', padding: '8px 0 4px' }}><Stamp id={l.stamp} size={cs?.cutter === 'wide' ? 250 : 200} /></div>
                <div className="center stack" style={{ gap: 2 }}>
                  {cs?.caption && <span style={{ fontSize: 20, fontStyle: 'italic' }}>{cs.caption}</span>}
                  <span className="small muted">{cs ? `Cut by ${cs.made_by === uid ? 'you' : other.name}${cs.postmark_place ? `, posted near ${cs.postmark_place}` : ''}, ${longDate(cs.postmark_at ?? l.sent_at)}` : `A Signed stamp, ${longDate(l.sent_at)}`}</span>
                </div>
                <button className="btn primary block" onClick={() => setPeek(false)}>Done</button>
              </div>
            </div>
          );
        })()}
        {!fromMe && (
          <>
            <div className="foot">
              <button className="btn" style={{ color: '#F4EFE6', borderColor: '#8C8174' }} onClick={() => file('wall')}>{l.place === 'wall' ? 'On your wall' : 'Pin to wall'}</button>
              <button className="btn" style={{ color: '#F4EFE6', borderColor: '#8C8174' }} onClick={() => file('trunk')}>{l.place === 'trunk' ? 'In the trunk' : 'Into trunk'}</button>
            </div>
            <button className="btn block" style={{ background: '#F4EFE6', color: '#2B2622', borderColor: '#F4EFE6', fontWeight: 600 }} onClick={() => go(`write/${other.id}`)}>Write back</button>
          </>
        )}
      </main>
    </div>
  );
}

function Video({ path }: { path: string }) {
  const url = useSigned(path);
  return url ? <video src={url} controls playsInline style={{ width: '100%', border: '6px solid #FDFCF8', boxShadow: '0 4px 10px rgba(0,0,0,.2)' }} /> : <div className="photo-wait" />;
}

/** The letter reads itself: each word appears in ink as the voice says it. */
function TalkingBody({ letter }: { letter: Letter }) {
  const url = useSigned(letter.audio_path);
  const audio = useRef<HTMLAudioElement>(null);
  const [time, setTime] = useState(-1);
  const words = letter.transcript?.length ? letter.transcript : null;
  const plain = letter.body.split(/\s+/).filter(Boolean);
  useEffect(() => { setTime(-1); }, [url]);
  const shown = (i: number, start?: number) => {
    if (time < 0) return true; // before playing, the page shows the whole letter
    if (start != null) return start <= time;
    const dur = audio.current?.duration || 1;
    return i / Math.max(1, plain.length) <= time / dur;
  };
  return (
    <div className="stack" style={{ gap: 10 }}>
      {url ? <audio ref={audio} src={url} controls style={{ width: '100%' }} onPlay={() => setTime(0)} onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onEnded={() => setTime(-1)} /> : <p className="small" style={{ opacity: 0.7 }}>Loading the voice…</p>}
      <div className="body selectable">
        {words
          ? words.map((w, i) => <span key={i} className={`ink-word${shown(i, w.start) ? ' on' : ''}`}>{w.word} </span>)
          : plain.map((w, i) => <span key={i} className={`ink-word${shown(i) ? ' on' : ''}`}>{w} </span>)}
      </div>
    </div>
  );
}
