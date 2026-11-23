import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { longDate } from '../lib/format';
import { Icon, Polaroid, Stamp, useSigned } from '../components/bits';
import type { Letter, WallPin } from '../lib/types';
import { toAnswer, toggleAnswer } from '../lib/answers';
import { lettersOn } from '../lib/days';
import { hasDraft } from '../lib/drafts';

/** `from` is the page the letter was opened from (wall, seals); closing goes back there. */
/** Which side the next letter of the day slides in from. */
let slideFrom: 'left' | 'right' | null = null;

export default function Reader({ id, from, day }: { id: string; from?: string; day?: string }) {
  const { me, letters, friend, session, refresh, say, stamps, pins } = useStore();
  const [peek, setPeek] = useState(false);
  const [, bump] = useState(0);
  useEffect(() => { slideFrom = null; }, [id]);
  const drag = useRef<{ x: number; y: number; dx: number; on: boolean } | null>(null);
  const sheet = useRef<HTMLElement>(null);
  // select a line of the letter and it can go up on your wall as a note; tap a pinned line to take it down
  const [chosen, setChosen] = useState<{ text: string } | null>(null);
  const [tapped, setTapped] = useState<{ pin: WallPin; x: number; y: number } | null>(null);
  const [pinning, setPinning] = useState(false);
  const l = letters.find((x) => x.id === id);
  const canPin = !!l && !!session && l.recipient === session.user.id;
  useEffect(() => {
    if (!canPin) return;
    const on = () => {
      const sel = window.getSelection();
      const node = sel && sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
      const el = node ? (node.nodeType === 1 ? node as Element : node.parentElement) : null;
      const text = sel?.toString().replace(/\s+/g, ' ').trim() ?? '';
      if (!sel || sel.isCollapsed || !text || !el?.closest('.sheet .selectable')) { setChosen(null); return; }
      setTapped(null);
      setChosen({ text });
    };
    document.addEventListener('selectionchange', on);
    return () => document.removeEventListener('selectionchange', on);
  }, [canPin, id]);
  useEffect(() => { setChosen(null); setTapped(null); }, [id]);
  if (!me || !l) return null;
  const uid = session!.user.id;
  const fromMe = l.sender === uid;
  const other = friend(fromMe ? l.recipient : l.sender)?.profile;
  if (!other) return null;
  const author = fromMe ? me : other;

  // letters from the same day, opened from the seal calendar: step through them
  const dayList = day ? lettersOn(letters, uid, day) : [];
  const at = dayList.findIndex((x) => x.id === l.id);
  const step = (n: number) => { const next = dayList[at + n]; if (next) { slideFrom = n > 0 ? 'right' : 'left'; go(`read/${next.id}/${from ?? 'seals'}/${day}`); } };
  // a horizontal drag moves only the letter; let go past a third of the way and the next one slides in
  const paging = dayList.length > 1;
  const enter = slideFrom;
  const onDown = (e: React.PointerEvent) => { if (paging) drag.current = { x: e.clientX, y: e.clientY, dx: 0, on: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || !sheet.current) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) { if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) { d.on = true; (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } else if (Math.abs(dy) > 10) { drag.current = null; return; } else return; }
    const edge = (dx > 0 && at <= 0) || (dx < 0 && at >= dayList.length - 1);
    d.dx = edge ? dx / 4 : dx;
    sheet.current.style.transition = 'none';
    sheet.current.style.transform = `translateX(${d.dx}px) rotate(${d.dx / 60}deg)`;
  };
  const onUp = () => {
    const d = drag.current; drag.current = null; if (!d || !sheet.current) return;
    const w = sheet.current.offsetWidth, go1 = d.on && Math.abs(d.dx) > w * 0.28;
    const can = go1 && ((d.dx < 0 && at < dayList.length - 1) || (d.dx > 0 && at > 0));
    sheet.current.style.transition = 'transform .22s ease-out';
    if (can) { sheet.current.style.transform = `translateX(${d.dx < 0 ? -w * 1.2 : w * 1.2}px) rotate(${d.dx < 0 ? -6 : 6}deg)`; window.setTimeout(() => step(d.dx < 0 ? 1 : -1), 180); }
    else sheet.current.style.transform = '';
  };
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

  const notes = pins.filter((x) => x.letter_id === l.id && x.quote);
  async function pinLine() {
    if (!chosen || pinning) return;
    const quote = chosen.text;
    if (quote.length > 400) { say('That’s a lot for one note. Pick a line or two.'); return; }
    if (notes.some((n) => n.quote === quote)) { say('That line is already on your wall.'); return; }
    setPinning(true);
    const { error } = await supabase.from('wall_pins').insert({ letter_id: l!.id, quote });
    setPinning(false);
    if (error) { say('Could not pin it. Try again.'); return; }
    window.getSelection()?.removeAllRanges(); setChosen(null);
    await refresh(); say('Pinned to your wall as a note.');
  }
  async function unpinLine(pin: WallPin) {
    setTapped(null);
    await supabase.from('wall_pins').delete().eq('id', pin.id);
    await refresh(); say('Taken off your wall.');
  }
  const tapNote = (pin: WallPin, e: React.MouseEvent) => {
    const sel = window.getSelection(); if (sel && !sel.isCollapsed) return;
    const r = (e.currentTarget as Element).getBoundingClientRect();
    setTapped({ pin, x: r.left + r.width / 2, y: r.bottom });
  };
  const pillAt = (x: number, y: number): React.CSSProperties => ({
    left: Math.min(window.innerWidth - 90, Math.max(90, x)), top: Math.min(window.innerHeight - 130, y + 14)
  });

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
        {dayList.length > 1 && (
          <div className="day-nav">
            <button className="icon" onClick={() => step(-1)} disabled={at <= 0} aria-label="Earlier letter that day">{Icon.back}</button>
            <span className="grow center small">{at + 1} of {dayList.length} that day</span>
            <button className="icon" onClick={() => step(1)} disabled={at >= dayList.length - 1} aria-label="Next letter that day" style={{ transform: 'scaleX(-1)' }}>{Icon.back}</button>
          </div>
        )}
        <article key={l.id} ref={sheet} className={`sheet stack${l.enchanted ? ' parch' : ''} ${paging && enter ? `slide-${enter}` : 'unfold'}`}
          style={{ gap: 16, minHeight: '60vh', touchAction: paging ? 'pan-y' : undefined }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className="crease" style={{ top: '33%' }} />
          <div className="crease" style={{ top: '66%' }} />
          {l.video_path && <Video path={l.video_path} />}
          {l.audio_path ? <TalkingBody letter={l} notes={notes} onNote={tapNote} /> : l.body && <div className="body selectable"><Marked text={l.body} notes={notes} onNote={tapNote} /></div>}
          {(l.scraps ?? []).map((s, i) =>
            s.type === 'photo' && s.media_path ? <div key={i} className="stack" style={{ width: '55%', gap: 8 }}><Polaroid path={s.media_path} caption={s.text} width="100%" tilt={((i % 3) - 1) * 3} /><PinPhoto path={s.media_path} caption={s.text} /></div>
              : s.type === 'question' ? <QCard key={i} label={fromMe ? 'You asked' : `${other.name} asks you`} q={s.text ?? ''} k={`${l.id}:${i}`} />
                : <p key={i} style={{ fontStyle: 'italic', borderBottom: '1px dashed #D9CDB9', paddingBottom: 8 }}>{s.text}</p>
          )}
          {l.photo_path && <div className="stack" style={{ marginLeft: 'auto', width: '58%', gap: 8 }}><Polaroid path={l.photo_path} caption={l.photo_caption} width="100%" tilt={4} /><PinPhoto path={l.photo_path} caption={l.photo_caption} /></div>}
          {(l.photos ?? []).length > 0 && (
            <div className="polaroids">
              {l.photos!.map((ph, n) => (
                <div key={ph.path} className="stack" style={{ gap: 8 }}><Polaroid path={ph.path} caption={ph.caption} width="100%" tilt={[3, -2, 2, -3][n % 4]} /><PinPhoto path={ph.path} caption={ph.caption} /></div>
              ))}
            </div>
          )}
          {l.question && <QCard label={fromMe ? 'You asked' : `${other.name} asks you`} q={l.question} k={`${l.id}:q`} tilt={-2} />}
          {(l.questions ?? []).map((q, n) => <QCard key={n} label={fromMe ? 'You asked' : `${other.name} asks you`} q={q} k={`${l.id}:q${n}`} tilt={n % 2 ? 1.5 : -2} />)}
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
        {chosen && (
          // docked at the bottom of the screen, clear of the phone's own Copy menu next to the selection
          <button className="pin-line pin-dock" disabled={pinning}
            onPointerDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()} onTouchEnd={(e) => { e.preventDefault(); void pinLine(); }} onClick={() => void pinLine()}>
            <span className="pin-line-tack" aria-hidden="true" />
            <span className="pin-dock-text">
              <b>{pinning ? 'Pinning…' : 'Pin to your wall'}</b>
              <small>“{chosen.text.length > 48 ? `${chosen.text.slice(0, 46).trimEnd()}…` : chosen.text}”</small>
            </span>
          </button>
        )}
        {tapped && (
          <>
            <div className="pin-line-back" onClick={() => setTapped(null)} />
            <button className="pin-line off" style={pillAt(tapped.x, tapped.y)} onClick={() => void unpinLine(tapped.pin)}>Take this note off your wall</button>
          </>
        )}
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
            <button className="btn block" style={{ background: '#F4EFE6', color: '#2B2622', borderColor: '#F4EFE6', fontWeight: 600 }} onClick={() => go(`write/${other.id}`)}>{hasDraft(other.id) ? 'Finish your reply' : 'Write back'}</button>
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
/** A voice note. When we have word timings, the spoken words write themselves in ink as it plays. */
function TalkingBody({ letter, notes, onNote }: { letter: Letter; notes: WallPin[]; onNote: (pin: WallPin, e: React.MouseEvent) => void }) {
  const url = useSigned(letter.audio_path);
  const [time, setTime] = useState(-1);
  const words = letter.transcript?.length ? letter.transcript : null;
  useEffect(() => { setTime(-1); }, [url]);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <span className="small" style={{ fontStyle: 'italic', opacity: 0.75 }}>A howler</span>
      {url ? <audio src={url} controls playsInline style={{ width: '100%' }} onPlay={() => setTime(0)} onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onEnded={() => setTime(-1)} /> : <p className="small" style={{ opacity: 0.7 }}>Loading the voice…</p>}
      {words && (
        <div className="body selectable">
          {words.map((w, i) => <span key={i} className={`ink-word${time < 0 || w.start <= time ? ' on' : ''}`}>{w.word} </span>)}
        </div>
      )}
      {letter.body && <div className="body selectable"><Marked text={letter.body} notes={notes} onNote={onNote} /></div>}
    </div>
  );
}

/** The letter's text, with the lines you pinned to your wall softly highlighted. Tap one to take it down. */
function Marked({ text, notes, onNote }: { text: string; notes: WallPin[]; onNote: (pin: WallPin, e: React.MouseEvent) => void }) {
  // a pinned line was saved with its spaces tidied, so match it across any line breaks in the letter
  const spans: { a: number; b: number; pin: WallPin }[] = [];
  for (const pin of notes) {
    const words = (pin.quote ?? '').split(' ').filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!words.length) continue;
    const m = new RegExp(words.join('\\s+')).exec(text);
    if (m && !spans.some((x) => m.index < x.b && m.index + m[0].length > x.a)) spans.push({ a: m.index, b: m.index + m[0].length, pin });
  }
  if (!spans.length) return <>{text}</>;
  spans.sort((x, y) => x.a - y.a);
  const out: React.ReactNode[] = [];
  let at = 0;
  spans.forEach((x) => {
    if (x.a > at) out.push(text.slice(at, x.a));
    out.push(<mark key={x.pin.id} className="pinned-line" onClick={(e) => onNote(x.pin, e)}>{text.slice(x.a, x.b)}</mark>);
    at = x.b;
  });
  if (at < text.length) out.push(text.slice(at));
  return <>{out}</>;
}
