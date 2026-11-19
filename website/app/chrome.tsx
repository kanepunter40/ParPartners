'use client';

// Pieces every page shares: the language choice, the header and the footer.

import { useEffect, useState } from 'react';
import { CONTENT, type Lang } from './content';

const SAVED = 'pp-lang';

/**
 * For pages that only have one address (the waitlist page and 404.html, which also serves /join/ invite links):
 * English by default; German for German browsers, or with ?lang=de. Switching happens in place.
 */
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

/**
 * For pages with an address per language (/ and /de/, /privacy/ and /de/privacy/ …), so Google can index both.
 * On an English page, German browsers and old ?lang=de links move to the German page,
 * unless the visitor last chose English with the language link. Google's crawler reads English, so it is never moved.
 */
export function usePageLang(lang: Lang) {
  useEffect(() => {
    if (lang !== 'en') return;
    const url = new URL(location.href);
    const q = url.searchParams.get('lang');
    let saved: string | null = null;
    try { saved = localStorage.getItem(SAVED); } catch {}
    const wantDe = q ? q === 'de' : saved ? saved === 'de' : /^de\b/i.test(navigator.language || '');
    if (!wantDe) return;
    url.searchParams.delete('lang');
    url.pathname = '/de' + url.pathname;
    location.replace(url);
  }, [lang]);
}

/** A link on a page in `lang`: German pages live under /de/. */
export const withLang = (href: string, lang: Lang) => (lang === 'de' ? `/de${href}` : href);

/**
 * `path` (e.g. '' or 'privacy/') when the page has an address per language: the language link goes to the other one.
 * `choose` when the page has one address: the language link switches in place.
 */
export function Header({ lang, path, choose }: { lang: Lang; path?: string; choose?: (l: Lang) => void }) {
  const other: Lang = lang === 'de' ? 'en' : 'de';
  const t = CONTENT[lang].nav;
  const home = (hash: string) => withLang('/', lang) + hash;
  const otherHref = path !== undefined ? withLang(`/${path}`, other) : `?lang=${other}`;
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
        href={otherHref}
        hrefLang={other}
        lang={other}
        onClick={(e) => {
          try { localStorage.setItem(SAVED, other); } catch {}
          if (choose) {
            e.preventDefault();
            choose(other);
          }
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
