import { Legal, legalMeta } from '../legal-pages';

export const metadata = legalMeta('privacy', 'en');

export default function Page() {
  return <Legal slug="privacy" lang="en" />;
}
