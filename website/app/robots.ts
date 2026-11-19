// /robots.txt: everything may be crawled except the waitlist confirm page; points crawlers at the sitemap.
import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/waitlist/' }, sitemap: 'https://parpartners.app/sitemap.xml' };
}
