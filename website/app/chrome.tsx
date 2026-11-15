'use client';

// Pieces every page shares: the language choice, the header and the footer.

import { useEffect, useState } from 'react';
import { CONTENT, type Lang } from './content';

/** English by default; German for German browsers, or when chosen with ?lang=de. */
export function useLang() {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('lang');
    if (q ? q === 'de' : /^de\b/i.test(navigator.language || '')) setLang('de');
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const choose = (l: Lang) => {
    setLang(l);
    const url = new URL(location.href);
    url.searchParams.set('lang', l);
    history.replaceState(null, '', url);
  };

  return [lang, choose] as const;
}

/** Adds ?lang=de to links on German pages, so the choice carries over. */
export const withLang = (href: string, lang: Lang) => (lang === 'de' ? `${href}?lang=de` : href);

export function Header({ lang, choose }: { lang: Lang; choose: (l: Lang) => void }) {
  const other: Lang = lang === 'de' ? 'en' : 'de';
  const t = CONTENT[lang].nav;
  const home = (hash: string) => withLang('/', lang) + hash;
  return (
    <header className="top wrap">
      <a className="brand" href={withLang('/', lang)}>
        <img src="/favicon.svg" alt="" width={28} height={28} /> PARtners
      </a>
      <nav className="top-links" aria-label="PARtners">
        <a href={home('#how')}>{t.how}</a>
        <a href={home('#features')}>{t.features}</a>
        <a href={home('#questions')}>{t.questions}</a>
      </nav>
      <a
        className="lang"
        href={`?lang=${other}`}
        lang={other}
        onClick={(e) => {
          e.preventDefault();
          choose(other);
        }}
      >
        {CONTENT[lang].other}
      </a>
      <a className="btn small" href={home('#get')}>{t.get}</a>
    </header>
  );
}

/** "Coming soon to Google Play". Not a link yet: the app isn't on Google Play. */
export function PlayBadge({ lang }: { lang: Lang }) {
  return (
    <span className="btn play">
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4 3.5v17l9-8.5-9-8.5zm10.4 9.9 2.6 2.4-11 6.3 8.4-8.7zm0-2.8L6 1.9l11 6.3-2.6 2.4zm3.6 3.6-2.9-2.7 2.9-2.7 3.4 1.9c1 .6 1 1.4 0 2l-3.4 1.5z" />
      </svg>
      <span><small>{CONTENT[lang].soon}</small>Google Play</span>
    </span>
  );
}

export function Footer({ lang, current }: { lang: Lang; current?: string }) {
  return (
    <footer className="foot wrap">
      <nav>
        {CONTENT[lang].links.map(([href, label]) => (
          <a key={href} href={withLang(href, lang)} aria-current={href === current ? 'page' : undefined}>
            {label}
          </a>
        ))}
      </nav>
      <span>© 2026 PARtners</span>
    </footer>
  );
}
