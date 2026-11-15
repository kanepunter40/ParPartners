'use client';

// Legal pages: privacy, terms, imprint and account deletion.
// The texts come straight from the app (src/app/pages/legal/legal-texts*.ts), so the two never drift apart.
// Both languages are in the HTML; the German one shows for German browsers or with ?lang=de.

import type { ReactNode } from 'react';
import { CONTACT, type LegalDoc } from '../../src/app/pages/legal/legal-texts';
import { Footer, Header, useLang, withLang } from './chrome';
import { CONTENT } from './content';
import en from '../../src/app/i18n/en.json';
import de from '../../src/app/i18n/de.json';

/** Turns the contact email into a link; everything else stays plain text. */
function Linked({ text }: { text: string }) {
  const parts = text.split(CONTACT);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <a href={`mailto:${CONTACT}`}>{CONTACT}</a>}
        </span>
      ))}
    </>
  );
}

export function Doc({ doc, lang }: { doc: LegalDoc; lang: 'en' | 'de' }) {
  const updated = (lang === 'de' ? de : en).legal.updated.replace('{date}', doc.updated);
  return (
    <>
      <h1>{doc.title}</h1>
      {doc.intro && <p className="intro"><Linked text={doc.intro} /></p>}
      <p className="updated">{updated}</p>
      {doc.sections.map((s) => (
        <section key={s.heading}>
          <h2>{s.heading}</h2>
          {s.body.map((b, i) => <p key={i}><Linked text={b} /></p>)}
        </section>
      ))}
    </>
  );
}

export function LegalPage({ slug, titles, en: enBody, de: deBody }: { slug: string; titles: [string, string]; en: ReactNode; de: ReactNode }) {
  const [lang, choose] = useLang();
  return (
    <>
      <title>{titles[lang === 'de' ? 1 : 0]}</title>
      <Header lang={lang} choose={choose} />
      <main className="legal wrap">
        <nav className="legal-nav">
          {CONTENT[lang].links.map(([href, label]) => (
            <a key={href} href={withLang(href, lang)} aria-current={href === `/${slug}/` ? 'page' : undefined}>{label}</a>
          ))}
        </nav>
        <article lang="en" hidden={lang !== 'en'}>{enBody}</article>
        <article lang="de" hidden={lang !== 'de'}>{deBody}</article>
      </main>
      <Footer lang={lang} current={`/${slug}/`} />
    </>
  );
}
