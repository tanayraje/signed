import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { go } from '../lib/router';
import { randomQuestion } from '../lib/format';
import { extFor, shrinkImage, upload } from '../lib/media';
import type { WordTiming } from '../lib/types';
import { BUILT_IN_STAMPS, Icon, Seal, Stamp } from '../components/bits';
import Cutter from './Cutter';

interface Draft { body: string; caption: string; question: string | null; stamp: string }
const draftKey = (id: string) => `signed.draft.${id}`;

type SpeechRec = { start: () => void; stop: () => void; continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null };

export default function Compose({ id }: { id: string }) {
  const { me, friend, session, stamps, say, refresh } = useStore();
  const uid = session!.user.id;
  const [draft, setDraft] = useState<Draft>(() => {
    try { return JSON.parse(localStorage.getItem(draftKey(id)) || '') as Draft; } catch { return { body: '', caption: '', question: null, stamp: 'lotus' }; }
  });
  const [enchanted, setEnchanted] = useState(false);
  const [photo, setPhoto] = useState<{ path: string; url: string } | null>(null);
  const [audio, setAudio] = useState<{ path: string; url: string; words: WordTiming[] } | null>(null);
  const [video, setVideo] = useState<{ path: string; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [live, setLive] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [cutting, setCutting] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const speech = useRef<SpeechRec | null>(null);

  useEffect(() => { try { localStorage.setItem(draftKey(id), JSON.stringify(draft)); } catch { /* storage full */ } }, [draft, id]);
  useEffect(() => {
    document.body.classList.toggle('ench', enchanted);
    return () => document.body.classList.remove('ench');
  }, [enchanted]);

  const f = friend(id);
  if (!me || !f) return null;
  const p = f.profile;
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const r = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: mime });
        setBusy('Saving your voice…');
        try {
          const path = await upload(uid, blob, extFor(mime));
          let words: WordTiming[] = [];
          const { data } = await supabase.functions.invoke('transcribe', { body: { path } });
          if (data?.words?.length) { words = data.words as WordTiming[]; set({ body: (data.text as string).trim() }); }
          else if (live.trim()) set({ body: live.trim() });
          setAudio({ path, url: URL.createObjectURL(blob), words });
        } catch (err) { say((err as Error).message); }
        setBusy(null);
      };
      rec.current = r;
      r.start();
      setRecording(true);
      setLive('');
      const SR = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
        ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
      if (SR) {
        const s = new SR();
        s.continuous = true; s.interimResults = true; s.lang = navigator.language || 'en-IN';
        s.onresult = (e) => setLive(Array.from(e.results).map((r) => r[0].transcript).join(' '));
        try { s.start(); speech.current = s; } catch { /* live words are a bonus */ }
      }
    } catch {
      say('Signed needs your microphone to record. Allow it in your browser settings.');
    }
  }
  function stopRecording() {
    rec.current?.stop();
    try { speech.current?.stop(); } catch { /* already stopped */ }
    setRecording(false);
  }

  async function seal() {
    if (!draft.body.trim() && !photo && !audio && !video) { say('Write something first, even one line.'); return; }
    setBusy('Sealing…');
    const { data, error } = await supabase.from('letters').insert({
      sender: uid, recipient: id, kind: 'letter', body: draft.body.trim(), question: draft.question, stamp: stampOk ? draft.stamp : 'lotus',
      photo_path: photo?.path ?? null, photo_caption: draft.caption || null,
      audio_path: audio?.path ?? null, video_path: video?.path ?? null, transcript: audio?.words.length ? audio.words : null,
      enchanted: enchanted || Boolean(audio || video)
    }).select('id').single();
    setBusy(null);
    if (error || !data) {
      if (error?.message.includes('stamp')) { set({ stamp: 'lotus' }); await refresh(); say('That stamp has already flown. Pick another.'); return; }
      say('Your letter did not send. Check your connection and try again.'); return;
    }
    try { localStorage.removeItem(draftKey(id)); } catch { /* fine */ }
    await refresh();
    say('Signed and sealed.');
    go(`flight/${data.id}`);
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

      {enchanted && (
        <section className="card stack center" style={{ padding: '16px 14px', alignItems: 'center' }}>
          <p className="small muted">Speak and your words write themselves in ink. When {p.name} opens it, the letter reads itself in your voice.</p>
          <button className={`rec${recording ? ' live' : ''}`} onClick={recording ? stopRecording : startRecording} aria-label={recording ? 'Stop recording' : 'Record a talking letter'}>
            {recording
              ? <svg width="26" height="26" viewBox="0 0 24 24" fill="#141A2E" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#141A2E" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>}
          </button>
          {audio && <audio src={audio.url} controls style={{ width: '100%' }} />}
          <div className="chips" style={{ justifyContent: 'center' }}>
            <label className="chip" htmlFor="videoIn">{video ? 'Moving picture added' : 'Record a moving picture'}</label>
            <input id="videoIn" type="file" accept="video/*" capture="user" hidden onChange={async (e) => {
              const file = e.target.files?.[0]; if (!file) return;
              if (file.size > 60e6) { say('That video is too long. Keep it under a minute.'); return; }
              setBusy('Saving your moving picture…');
              try { const path = await upload(uid, file, extFor(file.type)); setVideo({ path, url: URL.createObjectURL(file) }); } catch (err) { say((err as Error).message); }
              setBusy(null);
            }} />
          </div>
          {video && <video src={video.url} controls playsInline style={{ width: '100%', border: '6px solid #FDFCF8' }} />}
        </section>
      )}

      <div className={`sheet stack${enchanted ? ' parch' : ''}`} style={{ gap: 14 }}>
        <label htmlFor="bodyIn" className="small" style={{ fontStyle: 'italic', opacity: 0.7 }}>{enchanted ? 'The words your letter will say' : 'Your letter'}</label>
        <textarea id="bodyIn" rows={9} value={recording && live ? live : draft.body} onChange={(e) => set({ body: e.target.value })} placeholder={`Dear ${p.name},`} />
        {photo && <PreviewPolaroid url={photo.url} caption={draft.caption} />}
        {draft.question && <div className="qcard" style={{ transform: 'rotate(-2deg)' }}><small>You ask {p.name}</small>{draft.question}</div>}
        <div className="row" style={{ justifyContent: 'flex-end', alignItems: 'flex-end' }}>
          <div className="sig">{me.name}</div>
        </div>
      </div>

      <div className="chips">
        <label className="chip" htmlFor="photoIn">{photo ? 'Change Polaroid' : 'Add a Polaroid'}</label>
        <input id="photoIn" type="file" accept="image/*" hidden onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return;
          setBusy('Developing…');
          try { const blob = await shrinkImage(file); const path = await upload(uid, blob, 'jpg'); setPhoto({ path, url: URL.createObjectURL(blob) }); } catch (err) { say((err as Error).message); }
          setBusy(null); e.target.value = '';
        }} />
        <button className="chip" onClick={() => set({ question: randomQuestion() })}>{draft.question ? 'Another question' : 'Tuck in a question'}</button>
      </div>
      {photo && (<><label htmlFor="capIn" className="small muted" style={{ fontStyle: 'italic' }}>Polaroid caption</label>
        <input id="capIn" type="text" maxLength={28} value={draft.caption} onChange={(e) => set({ caption: e.target.value })} /></>)}

      <section className="stack"><h2>Stamp</h2>
        <div className="stamp-row">
          <button className="stamp-cut" onClick={() => setCutting(true)} aria-label="Cut a new stamp">{Icon.camera}<span>Cut one</span></button>
          {stampKeys.map((k) => (
            <button key={k} className={`stamp-pick${(stampOk ? draft.stamp : 'lotus') === k ? ' on' : ''}`} aria-pressed={draft.stamp === k} onClick={() => set({ stamp: k })}><Stamp id={k} size={48} /></button>
          ))}
        </div>
        {draft.stamp.startsWith('custom:') && stampOk && <p className="small muted">This stamp goes to {p.name} for good.</p>}
      </section>
      {cutting && <Cutter onDone={(sid) => { setCutting(false); if (sid) set({ stamp: `custom:${sid}` }); }} />}

      <div className="foot">
        <button className="btn wax" disabled={Boolean(busy) || recording} onClick={seal}>
          <Seal p={me} size={26} /> {busy ?? 'Sign and seal'}
        </button>
      </div>
    </main>
  );
}

function PreviewPolaroid({ url, caption }: { url: string; caption: string }) {
  return <figure className="polaroid" style={{ width: '60%', transform: 'rotate(3deg)', marginLeft: 'auto' }}><img src={url} alt="Your Polaroid" /><figcaption>{caption}</figcaption></figure>;
}

export function Sparks() {
  const [dots] = useState(() => Array.from({ length: 22 }, () => ({ l: Math.random() * 100, t: Math.random() * 100, d: Math.random() * 3 })));
  return <div className="sparks" aria-hidden="true">{dots.map((d, i) => <i key={i} style={{ left: `${d.l}%`, top: `${d.t}%`, animationDelay: `${d.d}s` }} />)}</div>;
}
