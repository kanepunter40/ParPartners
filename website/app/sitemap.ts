// /sitemap.xml for Google Search Console. Lists the public pages; /waitlist/ (email links) and /join/ (invites) stay out.
import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const PAGES = ['', 'privacy/', 'terms/', 'imprint/', 'delete-account/'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({ url: `https://parpartners.app/${path}`, changeFrequency: 'monthly', priority: path ? 0.3 : 1 }));
}
