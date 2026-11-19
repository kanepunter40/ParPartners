import { Legal, legalMeta } from '../../legal-pages';

export const metadata = legalMeta('terms', 'de');

export default function Page() {
  return <Legal slug="terms" lang="de" />;
}
