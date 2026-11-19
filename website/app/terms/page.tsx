import { Legal, legalMeta } from '../legal-pages';

export const metadata = legalMeta('terms', 'en');

export default function Page() {
  return <Legal slug="terms" lang="en" />;
}
