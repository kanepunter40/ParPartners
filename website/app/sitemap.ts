// /sitemap.xml for Google Search Console: every public page in English and German, each pointing at the other.
// /waitlist/ (email links) and /join/ (invites) stay out.
import type { MetadataRoute } from 'next';
import { SITE, pageUrl } from './seo';

export const dynamic = 'force-static';

const PAGES = ['', 'privacy/', 'terms/', 'imprint/', 'delete-account/'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((path) => {
    const languages = { en: SITE + pageUrl('en', path), de: SITE + pageUrl('de', path) };
    return (['en', 'de'] as const).map((lang) => ({
      url: languages[lang],
      changeFrequency: 'monthly' as const,
      priority: path ? 0.3 : 1,
      alternates: { languages }
    }));
  });
}
