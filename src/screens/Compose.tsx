import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { randomQuestion } from '../lib/format';
import { extFor, shrinkImage, upload } from '../lib/media';
import type { WordTiming } from '../lib/types';
import { BUILT_IN_STAMPS, Icon, Seal, Stamp } from '../components/bits';
import Cutter from './Cutter';
import SendOff from '../components/SendOff';
import { setToAnswer, toAnswer, type ToAnswer } from '../lib/answers';

interface Draft { body: string; caption?: string; question?: string | null; questions?: string[]; stamp: string; answers?: Record<string, string> }
interface Photo { path: string; url: string; caption: string }
const draftKey = (id: string) => `signed.draft.${id}`;

type SpeechRec = { start: () => void; stop: () => void; continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null };

export default function Compose({ id }: { id: string }) {
  const { me, friend, session, stamps, say, refresh } = useStore();
  const uid = session!.user.id;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey(id)) || '') as Draft;
      return { ...d, questions: d.questions ?? (d.question ? [d.question] : []) };
    } catch { return { body: '', questions: [], stamp: 'signed' }; }
  });
  const [enchanted, setEnchanted] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [audio, setAudio] = useState<{ path: string; url: string; words: WordTiming[] } | null>(null);
  const [video, setVideo] = useState<{ path: string; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<'voice' | 'video' | 'dictate'>('voice');
  const [dictating, setDictating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [cutting, setCutting] = useState(false);
  const [sent, setSent] = useState<{ id: string; arrive_at: string; stamp: string } | null>(null);
  const [asked, setAsked] = useState<ToAnswer[]>(() => toAnswer(id));
  const [nudge, setNudge] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const speech = useRef<SpeechRec | null>(null);

  useEffect(() => { try { localStorage.setItem(draftKey(id), JSON.stringify(draft)); } catch { /* storage full */ } }, [draft, id]);
  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [recording]);
  useEffect(() => () => { try { speech.current?.stop(); } catch { /* fine */ } }, []);
  useEffect(() => {
    document.body.classList.toggle('ench', enchanted);
    return () => document.body.classList.remove('ench');
  }, [enchanted]);

  const f = friend(id);
  if (!me || !f) return null;
  const p = f.profile;
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  // Enchanted letters carry one of three things: a voice note, a moving picture, or words you speak onto the page.
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // iPhones play mp4 audio, not webm, so ask for mp4 first
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? '';
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (r.mimeType || mime || 'audio/mp4').split(';')[0];
        const blob = new Blob(chunks, { type });
        setBusy('Saving your voice…');
        try {
          const path = await upload(uid, blob, extFor(type));
          let words: WordTiming[] = [];
          const { data } = await supabase.functions.invoke('transcribe', { body: { path } }).catch(() => ({ data: null }));
          if (data?.words?.length) words = data.words as WordTiming[];
          setAudio({ path, url: URL.createObjectURL(blob), words });
        } catch (err) { say((err as Error).message); }
        setBusy(null);
      };
      rec.current = r;
      r.start();
      setRecording(true);
      setElapsed(0);
    } catch {
      say('Signed needs your microphone to record. Allow it in your browser settings.');
    }
  }
  function stopRecording() {
    rec.current?.stop();
    setRecording(false);
  }

  function startDictation() {
    const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!SR) { say('This browser cannot turn speech into words. Use the mic on your keyboard instead.'); return; }
    const base = draft.body.trim();
    const s = new SR();
    s.continuous = true; s.interimResults = true; s.lang = navigator.language || 'en-IN';
    s.onresult = (e) => {
      const said = Array.from(e.results).map((r) => r[0].transcript).join(' ').trim();
      setDraft((d) => ({ ...d, body: [base, said].filter(Boolean).join(base.endsWith('.') ? ' ' : base ? ' ' : '') }));
    };
    try { s.start(); speech.current = s; setDictating(true); } catch { say('Could not start listening. Try again.'); }
  }
  function stopDictation() {
    try { speech.current?.stop(); } catch { /* already stopped */ }
    setDictating(false);
  }

  async function seal() {
    const unanswered = asked.filter((q) => !draft.answers?.[q.key]?.trim());
    if (unanswered.length) { setNudge(true); say(unanswered.length === 1 ? 'Answer the question first, or tap × to skip it.' : `Answer the ${unanswered.length} questions first, or tap × to skip them.`); return; }
    if (!draft.body.trim() && !photos.length && !audio && !video && !asked.length) { say('Write something first, even one line.'); return; }
    setBusy('Sealing…');
    const qs = (draft.questions ?? []).map((q) => q.trim()).filter(Boolean);
    const answers = asked.map((q) => ({ question: q.question, answer: (draft.answers?.[q.key] ?? '').trim(), letter_id: q.letter_id, key: q.key })).filter((a) => a.answer);
    const { data, error } = await supabase.from('letters').insert({
      sender: uid, recipient: id, kind: 'letter', body: draft.body.trim(), question: null, questions: qs.length ? qs : null, stamp: stampOk ? draft.stamp : 'signed',
      photos: photos.length ? photos.map((x) => ({ path: x.path, caption: x.caption.trim() || null })) : null,
      audio_path: audio?.path ?? null, video_path: video?.path ?? null, transcript: audio?.words.length ? audio.words : null,
      enchanted: enchanted || Boolean(audio || video),
      answers: answers.length ? answers.map(({ key: _k, ...a }) => a) : null
    }).select('id, arrive_at').single();
    setBusy(null);
    if (error || !data) {
      if (error?.message.includes('stamp')) { set({ stamp: 'signed' }); await refresh(); say('That stamp has already flown. Pick another.'); return; }
      say('Your letter did not send. Check your connection and try again.'); return;
    }
    try { localStorage.removeItem(draftKey(id)); } catch { /* fine */ }
    const done = new Set(answers.map((a) => a.key));
    setToAnswer(id, toAnswer(id).filter((q) => !done.has(q.key)));
    await refresh();
    setSent({ id: data.id, arrive_at: (data as { arrive_at?: string }).arrive_at ?? new Date().toISOString(), stamp: stampOk ? draft.stamp : 'signed' });
  }

  const stampKeys = [...stamps.filter((s) => s.owner === uid && s.status === 'mine').map((s) => `custom:${s.id}`), ...BUILT_IN_STAMPS];
  const stampOk = stampKeys.includes(draft.stamp);

  return (
    <main className="app">
      {enchanted && <Sparks />}
      <div className="top">
        <button className="icon" onClick={() => go(`friend/${id}`)} aria-label="Back">{Icon.back}</button>
        <h1 className="grow" style={{ fontSize: 24 }}>{enchanted ? `Speak to ${p.name}` : `Dear ${p.name}`}</h1>
        <button className="ench-switch" role="switch" aria-checked={enchanted} aria-label="Enchanted mode" onClick={() => setEnchanted(!enchanted)}>
          <span className="knob">{enchanted ? Icon.star : Icon.quill}</span>
        </button>
      </div>

      {enchanted && (() => {
        const locked = audio ? 'voice' : video ? 'video' : null;
        const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
        const MODES: [typeof mode, string, string][] = [
          ['voice', 'Howler', `Say it out loud. ${p.name} hears it in your own voice, tucked inside the letter.`],
          ['video', 'Moving picture', `A short video of you that plays inside the letter.`],
          ['dictate', 'Talking ink', 'Talk, and your words appear on the page as ink. Only the words are sent.']
        ];
        return (
          <section className="ench-panel stack">
            <div className="ench-seg" role="radiogroup" aria-label="What to send">
              {MODES.map(([k, label]) => (
                <button key={k} role="radio" aria-checked={mode === k} className={mode === k ? 'on' : ''}
                  disabled={(locked !== null && locked !== k) || recording || dictating} onClick={() => setMode(k)}>{label}</button>
              ))}
            </div>
            <p className="ench-hint">{locked && locked !== mode ? '' : MODES.find((m) => m[0] === mode)![2]}</p>

            {mode === 'voice' && (
              audio ? (
                <div className="stack" style={{ gap: 10 }}>
                  <audio src={audio.url} controls playsInline style={{ width: '100%' }} />
                  <button className="chip ench-chip" onClick={() => setAudio(null)}>Remove howler</button>
                </div>
              ) : (
                <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
                  <button className={`rec${recording ? ' live' : ''}`} onClick={recording ? stopRecording : startRecording} aria-label={recording ? 'Stop recording' : 'Record a howler'}>
                    {recording
                      ? <svg width="26" height="26" viewBox="0 0 24 24" fill="#141A2E" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                      : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#141A2E" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>}
                  </button>
                  <span className="ench-hint">{recording ? `Recording ${mmss}. Tap to stop.` : 'Tap to record'}</span>
                </div>
              )
            )}

            {mode === 'video' && (
              video ? (
                <div className="stack" style={{ gap: 10 }}>
                  <video src={video.url} controls playsInline style={{ width: '100%', border: '6px solid #FDFCF8' }} />
                  <button className="chip ench-chip" onClick={() => setVideo(null)}>Remove moving picture</button>
                </div>
              ) : (
                <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
                  <label className="rec" htmlFor="videoIn" aria-label="Record a moving picture">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#141A2E" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10.5l5-3v9l-5-3z" /></svg>
                  </label>
                  <span className="ench-hint">Tap to film, up to a minute</span>
                  <input id="videoIn" type="file" accept="video/*" capture="user" hidden onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    if (file.size > 60e6) { say('That video is too long. Keep it under a minute.'); return; }
                    setBusy('Saving your moving picture…');
                    try { const path = await upload(uid, file, extFor(file.type)); setVideo({ path, url: URL.createObjectURL(file) }); } catch (err) { say((err as Error).message); }
                    setBusy(null); e.target.value = '';
                  }} />
                </div>
              )
            )}

            {mode === 'dictate' && (
              <div className="stack" style={{ alignItems: 'center', gap: 8 }}>
                <button className={`rec${dictating ? ' live' : ''}`} onClick={dictating ? stopDictation : startDictation} aria-label={dictating ? 'Stop listening' : 'Start speaking'}>
                  {dictating
                    ? <svg width="26" height="26" viewBox="0 0 24 24" fill="#141A2E" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                    : <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.6 3.2c-5.6.4-10.2 4-12.4 9.7-.6 1.6-1 3.2-1.2 4.8l1.5-1.2c2-.4 4-1.3 5.7-2.9-1.3.1-2.4 0-3.3-.3 1.7-.2 3.3-.8 4.7-1.9-1 0-1.9-.1-2.7-.4 1.7-.5 3.1-1.4 4.3-2.7.9-1.2 2.1-3 3.4-5.1z" fill="#141A2E" /><path d="M18.4 5.6L5.2 19.4" stroke="#E2C27A" strokeWidth="0.9" strokeLinecap="round" /><path d="M7.4 17.1L3.6 21" stroke="#141A2E" strokeWidth="1.6" strokeLinecap="round" /></svg>}
                </button>
                <span className="ench-hint">{dictating ? 'Listening. Your words appear on the page below.' : 'Tap and start talking'}</span>
              </div>
            )}
            {locked && locked !== mode && <p className="ench-hint">Remove your {locked === 'voice' ? 'howler' : 'moving picture'} to choose something else.</p>}
          </section>
        );
      })()}

      <div className={`sheet stack${enchanted ? ' parch' : ''}`} style={{ gap: 14 }}>
        <label htmlFor="bodyIn" className="small" style={{ fontStyle: 'italic', opacity: 0.7 }}>{!enchanted ? 'Your letter' : mode === 'dictate' ? 'Your words, as you speak them' : 'Write a few lines too (optional)'}</label>
        <textarea id="bodyIn" rows={9} value={draft.body} onChange={(e) => set({ body: e.target.value })} placeholder={`Dear ${p.name},`} />
        {asked.map((q) => (
          <div key={q.key} className={`answer-box${nudge && !draft.answers?.[q.key]?.trim() ? ' need' : ''}`}>
            <div className="row" style={{ alignItems: 'flex-start', gap: 8 }}>
              <span className="grow"><small>{p.name} asked · answer before sending</small><span className="answer-q">{q.question}</span></span>
              <button className="answer-x" onClick={() => { const next = asked.filter((x) => x.key !== q.key); setAsked(next); setToAnswer(id, next); }} aria-label="Don't answer this one">{Icon.close}</button>
            </div>
            <textarea rows={2} value={draft.answers?.[q.key] ?? ''} placeholder="Your answer" aria-label={`Answer: ${q.question}`}
              onChange={(e) => set({ answers: { ...(draft.answers ?? {}), [q.key]: e.target.value } })} />
          </div>
        ))}
        {photos.length > 0 && (
          <div className="polaroids">
            {photos.map((ph, n) => (
              <figure key={ph.path} className="polaroid edit" style={{ transform: `rotate(${[3, -2, 2, -3][n % 4]}deg)` }}>
                <button className="scrap-x" onClick={() => { setPhotos(photos.filter((x) => x.path !== ph.path)); void supabase.storage.from('mail').remove([ph.path]); }} aria-label="Remove this Polaroid">{Icon.close}</button>
                <img src={ph.url} alt={ph.caption || 'Your Polaroid'} />
                <textarea className="pol-cap" rows={1} maxLength={90} value={ph.caption} placeholder="Write a little note"
                  aria-label="Note on the Polaroid" onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }} onChange={(e) => setPhotos(photos.map((x) => x.path === ph.path ? { ...x, caption: e.target.value } : x))} />
              </figure>
            ))}
          </div>
        )}
        {(draft.questions ?? []).map((q, n) => (
          <div key={n} className="qcard q-edit" style={{ transform: `rotate(${n % 2 ? 1.5 : -2}deg)` }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <small className="grow">You ask {p.name}</small>
              <button className="answer-x" onClick={() => set({ questions: (draft.questions ?? []).filter((_, k) => k !== n) })} aria-label="Take this question out">{Icon.close}</button>
            </div>
            <textarea rows={2} maxLength={200} value={q} onChange={(e) => set({ questions: (draft.questions ?? []).map((x, k) => k === n ? e.target.value : x) })}
              placeholder={`Ask ${p.name} anything`} aria-label={`Question ${n + 1} for ${p.name}`} />
            <button className="q-idea" onClick={() => set({ questions: (draft.questions ?? []).map((x, k) => k === n ? randomQuestion() : x) })}>Give me another idea</button>
          </div>
        ))}
        <div className="row" style={{ justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <div className="sig">{me.name}</div>
        </div>
      </div>

      <div className="chips">
        {photos.length < 6 && <label className="chip" htmlFor="photoIn">{photos.length ? 'Add another Polaroid' : 'Add a Polaroid'}</label>}
        <input id="photoIn" type="file" accept="image/*" multiple hidden onChange={async (e) => {
          const files = [...(e.target.files ?? [])].slice(0, 6 - photos.length); if (!files.length) return;
          setBusy('Developing…');
          const added: Photo[] = [];
          for (const file of files) {
            try { const blob = await shrinkImage(file); const path = await upload(uid, blob, 'jpg'); added.push({ path, url: URL.createObjectURL(blob), caption: '' }); } catch (err) { say((err as Error).message); }
          }
          setPhotos((cur) => [...cur, ...added]);
          setBusy(null); e.target.value = '';
        }} />
        {(draft.questions ?? []).length < 5 && <button className="chip" onClick={() => set({ questions: [...(draft.questions ?? []), randomQuestion()] })}>{(draft.questions ?? []).length ? 'Tuck in another question' : 'Tuck in a question'}</button>}
      </div>

      <section className="stack"><h2>Stamp</h2>
        <div className="stamp-row">
          <button className="stamp-cut" onClick={() => setCutting(true)} aria-label="Cut a new stamp">{Icon.camera}<span>Cut one</span></button>
          {stampKeys.map((k) => (
            <button key={k} className={`stamp-pick${(stampOk ? draft.stamp : 'signed') === k ? ' on' : ''}`} aria-pressed={draft.stamp === k} onClick={() => set({ stamp: k })}><Stamp id={k} size={48} /></button>
          ))}
        </div>
        {draft.stamp.startsWith('custom:') && stampOk && <p className="small muted">This stamp goes to {p.name} for good.</p>}
      </section>
      {sent && <SendOff me={me} to={p} stamp={sent.stamp} arriveAt={sent.arrive_at} onDone={() => go(`flight/${sent.id}`)} />}
      {cutting && <Cutter onDone={(sid) => { setCutting(false); if (sid) set({ stamp: `custom:${sid}` }); }} />}

      <div className="foot">
        <button className="btn wax" disabled={Boolean(busy) || recording} onClick={seal}>
          <Seal p={me} size={26} /> {busy ?? 'Sign and seal'}
        </button>
      </div>
    </main>
  );
}


export function Sparks() {
  const [dots] = useState(() => Array.from({ length: 22 }, () => ({ l: Math.random() * 100, t: Math.random() * 100, d: Math.random() * 3 })));
  return <div className="sparks" aria-hidden="true">{dots.map((d, i) => <i key={i} style={{ left: `${d.l}%`, top: `${d.t}%`, animationDelay: `${d.d}s` }} />)}</div>;
}
