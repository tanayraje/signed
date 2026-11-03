import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { go } from '../lib/router';
import { Owl, Seal, Wordmark } from '../components/bits';

export const TOURED = 'signed.toured';

/** A short swipeable welcome: the five things worth knowing. Shown once, and again from Profile. */
export default function Tour() {
  const { me } = useStore();
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  if (!me) return null;

  const slides = [
    {
      art: <div className="tour-art"><Wordmark size={54} /></div>,
      title: 'Letters between friends',
      text: 'Write to the people you love the slow way. Every letter closes with the wax seal you designed.'
    },
    {
      art: <div className="tour-art tour-map"><img src="/assets/owl-fly.png" alt="" className="tour-fly" /><span className="tour-dot a" /><span className="tour-dot b" /><svg viewBox="0 0 200 120" aria-hidden="true"><path d="M30 95C70 40 120 110 170 30" fill="none" stroke="#2B2622" strokeOpacity=".45" strokeDasharray="2 6" strokeWidth="1.6" strokeLinecap="round" /></svg></div>,
      title: 'Carried by owl',
      text: 'Your owl flies each letter from you to them. The farther apart you are, the longer it takes. Watch it cross the map.'
    },
    {
      art: <div className="tour-art"><div className="tour-env"><Seal p={me} size={64} /></div><div className="tour-owl"><Owl p={me} width={58} /></div></div>,
      title: 'Lift the seal',
      text: 'When a letter lands, press and hold the seal to open it. Pin it to your wall, or fold it into the trunk.'
    },
    {
      art: <div className="tour-art"><span className="wm-paper tour-scrap" /><span className="wm-paper tour-scrap two" /><span className="wm-env tour-mini"><i /></span></div>,
      title: 'Scraps for post day',
      text: 'Drop little things into a friend’s pocket through the week: a line, a photo, a question. They leave together on post day.'
    },
    {
      art: <div className="tour-art"><img src="/assets/tour-stamp-1.png" alt="" className="tour-stamp" /><img src="/assets/tour-stamp-2.png" alt="" className="tour-stamp two" /></div>,
      title: 'Stamps that are yours',
      text: 'Cut stamps from anything with your camera. Each one flies off on a letter and becomes your friend’s, postmarked, for keeps.'
    }
  ];
  const last = slides.length - 1;
  const to = (n: number) => track.current?.scrollTo({ left: n * track.current.clientWidth, behavior: 'smooth' });
  const done = () => { try { localStorage.setItem(TOURED, '1'); } catch { /* fine */ } go('wall'); };

  return (
    <div className="tour">
      <button className="tour-skip" onClick={done}>{i === last ? '' : 'Skip'}</button>
      <div className="tour-track" ref={track} onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        {slides.map((s, n) => (
          <section key={n} className="tour-slide" aria-label={`${n + 1} of ${slides.length}: ${s.title}`}>
            {s.art}
            <h1>{s.title}</h1>
            <p>{s.text}</p>
          </section>
        ))}
      </div>
      <div className="tour-foot">
        <div className="tour-dots" aria-hidden="true">{slides.map((_, n) => <i key={n} className={n === i ? 'on' : ''} />)}</div>
        <button className="btn wax block" onClick={() => (i === last ? done() : to(i + 1))}>{i === last ? 'Start writing' : 'Next'}</button>
      </div>
    </div>
  );
}
