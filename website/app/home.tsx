'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { CONTENT, PARS } from './content';
import { Footer, Header, useLang } from './chrome';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

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
        start: 'top 88%',
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
          <h1 data-reveal>{t.h1}</h1>
          <p className="lead" data-reveal>{t.lead}</p>
          <p className="soon" data-reveal>
            {t.soon} <a href="#steps">{t.how}</a>
          </p>
        </section>

        <figure className="photo wrap" data-reveal>
          <img src="/course.jpg" alt={t.photoAlt} width={900} height={563} />
        </figure>

        <ol className="steps wrap" id="steps">
          <li className="step">
            <div className="say">
              <span className="num" data-reveal>1</span>
              <h2 data-reveal>{t.s1.h}</h2>
              <p data-reveal>{t.s1.p}</p>
            </div>
            <div className="show">
              <p className="list-title" data-reveal>{t.s1.list}</p>
              <ul className="group">
                {t.s1.rounds.map((r, i) => (
                  <li key={i} className="round" data-reveal>
                    <span className="date"><small>{r.day}</small>{r.date}</span>
                    <span className="what"><strong>{r.line}</strong><span>{r.detail}</span></span>
                    <span className="km">{r.km}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>

          <li className="step">
            <div className="say">
              <span className="num" data-reveal>2</span>
              <h2 data-reveal>{t.s2.h}</h2>
              <p data-reveal>{t.s2.p}</p>
            </div>
            <div className="show">
              <p className="list-title" data-reveal>{t.s2.list}</p>
              <ul className="group">
                {t.s2.notes.map((n, i) => (
                  <li key={i} className="note" data-reveal>
                    <span className="dot" aria-hidden="true" />
                    <span className="what">{n.text}</span>
                    <span className="km">{n.when}</span>
                  </li>
                ))}
              </ul>
            </div>
          </li>

          <li className="step">
            <div className="say">
              <span className="num" data-reveal>3</span>
              <h2 data-reveal>{t.s3.h}</h2>
              <p data-reveal>{t.s3.p}</p>
            </div>
            <div className="show">
              <p className="list-title" data-reveal>{t.s3.list}</p>
              <div className="group card" data-reveal>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{t.s3.hole}</th>
                      {PARS.map((_, i) => <th key={i} scope="col">{i + 1}</th>)}
                      <th scope="col">{t.s3.out}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="par">
                      <th scope="row">{t.s3.par}</th>
                      {PARS.map((p, i) => <td key={i}>{p}</td>)}
                      <td>{sum(PARS)}</td>
                    </tr>
                    {t.s3.players.map((p) => (
                      <tr key={p.name}>
                        <th scope="row">{p.name}</th>
                        {p.scores.map((s, i) => (
                          <td key={i} className={s < PARS[i] ? 'under' : s > PARS[i] ? 'over' : undefined}>{s}</td>
                        ))}
                        <td className="total">{sum(p.scores)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </li>
        </ol>

        <section className="more wrap">
          <h2 data-reveal>{t.more.h}</h2>
          <dl>
            {t.more.items.map(([k, v]) => (
              <div key={k} data-reveal>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="end wrap">
          <h2 data-reveal>{t.end}</h2>
          <p data-reveal>{t.endP}</p>
        </section>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
