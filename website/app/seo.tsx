// What search engines and link previews see: title, description, the page's address in each language,
// the preview card (WhatsApp, Instagram, email…) and structured data about the app.

import type { Metadata } from 'next';
import { CONTENT, type Lang } from './content';

export const SITE = 'https://parpartners.app';

/** '' for the home page, 'privacy/' etc. English lives at /path, German at /de/path. */
export const pageUrl = (lang: Lang, path: string) => (lang === 'de' ? `/de/${path}` : `/${path}`);

export function pageMeta(lang: Lang, path: string, title: string, description: string): Metadata {
  const url = pageUrl(lang, path);
  const image = { url: `/og-${lang}.png`, width: 1200, height: 630, alt: CONTENT[lang].ogAlt };
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { en: pageUrl('en', path), de: pageUrl('de', path), 'x-default': pageUrl('en', path) }
    },
    openGraph: {
      type: 'website',
      siteName: 'PARtners',
      url,
      title,
      description,
      locale: lang === 'de' ? 'de_DE' : 'en_GB',
      alternateLocale: lang === 'de' ? ['en_GB'] : ['de_DE'],
      images: [image]
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] }
  };
}

/** Structured data for the home page: the site's name (shown above Google results) and the app itself. */
export function AppJsonLd({ lang }: { lang: Lang }) {
  const t = CONTENT[lang];
  const data = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'PARtners', url: `${SITE}/`, inLanguage: ['en', 'de'] },
    {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'PARtners',
      url: SITE + pageUrl(lang, ''),
      description: t.description,
      inLanguage: lang,
      operatingSystem: 'Android',
      applicationCategory: 'SportsApplication',
      image: `${SITE}/og-${lang}.png`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
    }
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
