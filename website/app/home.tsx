'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { CONTENT, type Icon, type Lang, type Shot } from './content';
import { Footer, Header, useLang } from './chrome';
import { WaitlistForm } from './waitlist';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** A real app screen, shown flat with rounded corners (no phone frame). */
function Screen({ lang, shot, alt = '', lazy, className }: { lang: Lang; shot: Shot; alt?: string; lazy?: boolean; className?: string }) {
  return (
    <div className={`screen${className ? ' ' + className : ''}`}>
      <img src={`/screens/${lang}/${shot}.webp`} alt={alt} width={780} height={1688} loading={lazy ? 'lazy' : undefined} />
    </div>
  );
}

const ICONS: Record<Icon, React.ReactNode> = {
  find: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  chat: <path d="M4 5h16v11H8l-4 4z" />,
  card: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  friends: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.8.7 3 2.5 3.5 5.2" /></>,
  bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" />,
  free: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  weather: <><path d="M8 4.5v1.5M3.6 6.3l1 1M2 10.5h1.5M12.4 6.3l-1 1" /><path d="M5.2 12.3A3.5 3.5 0 1 1 11.3 9" /><path d="M8.5 19.5h9a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6.6 3.2 3.2 0 0 0 .2 6.4z" /></>,
  host: <><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c.8-3.5 3.4-5.5 6.5-5.5 1.3 0 2.5.3 3.5 1M15.5 18l2 2 4-4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></>
};

const Svg = ({ icon }: { icon: Icon }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[icon]}</svg>
);

export default function Home() {
  const [lang, choose] = useLang();
  const root = useRef<HTMLDivElement>(null);
  const t = CONTENT[lang];

  // Scroll reveals: each block eases up once as it comes into view. Nothing loops.
  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(items, { autoAlpha: 1 });
        return;
      }
      gsap.set(items, { autoAlpha: 0, y: 24 });
      ScrollTrigger.batch(items, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08, overwrite: true })
      });
    },
    { scope: root }
  );

  return (
    <div ref={root}>
      <title>{t.title}</title>
      <Header lang={lang} choose={choose} />

      <main>
        <section className="hero wrap">
          <div className="hero-copy">
            <h1 data-reveal>{t.h1}</h1>
            <p className="lead" data-reveal>{t.lead}</p>
            <div data-reveal><WaitlistForm lang={lang} /></div>
            <p className="meta" data-reveal>{t.meta}</p>
          </div>
          <div className="pair" data-reveal>
            <Screen lang={lang} shot="find" alt={t.heroAlt[0]} className="back" />
            <Screen lang={lang} shot="home" alt={t.heroAlt[1]} className="front" />
          </div>
        </section>

        <section className="how wrap" id="how">
          <h2 data-reveal>{t.how.h}</h2>
          <p className="sub" data-reveal>{t.how.p}</p>
          <ol className="steps">
            {t.how.steps.map((s, i) => (
              <li key={s.shot} data-reveal>
                <Screen lang={lang} shot={s.shot} lazy />
                <span className="step">{t.how.step} {i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.p}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="round wrap">
          <h2 data-reveal>{t.round.h}</h2>
          <p className="sub" data-reveal>{t.round.p}</p>
          <div className="stage">
            <ul className="notes left">
              {t.round.left.map(([icon, b, s], i) => <li key={i} data-reveal><span className="note-icon"><Svg icon={icon} /></span><span><b>{b}</b><span>{s}</span></span></li>)}
            </ul>
            <div className="stage-screen" data-reveal><Screen lang={lang} shot="round" alt={t.round.alt} /></div>
            <ul className="notes">
              {t.round.right.map(([icon, b, s], i) => <li key={i} data-reveal><span className="note-icon"><Svg icon={icon} /></span><span><b>{b}</b><span>{s}</span></span></li>)}
            </ul>
          </div>
        </section>

        <section className="two wrap">
          <div id="features">
            <h2 data-reveal>{t.features.h}</h2>
            <ul className="group" data-reveal>
              {t.features.items.map(([icon, title, sub]) => (
                <li key={icon}>
                  <Svg icon={icon} />
                  <span><b>{title}</b><small>{sub}</small></span>
                </li>
              ))}
            </ul>
          </div>
          <div id="questions">
            <h2 data-reveal>{t.faq.h}</h2>
            <div className="faq" data-reveal>
              {t.faq.items.map(([q, a], i) => (
                <details key={i} open={i === 0}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="wrap" id="get">
          <div className="cta" data-reveal>
            <div>
              <h2>{t.end.h}</h2>
              <p>{t.end.p}</p>
            </div>
            <WaitlistForm lang={lang} />
          </div>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
