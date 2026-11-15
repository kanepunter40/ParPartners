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
  return (
    <header className="top wrap">
      <a className="brand" href={withLang('/', lang)}>
        <img src="/favicon.svg" alt="" width={28} height={28} /> PARtners
      </a>
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
    </header>
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
