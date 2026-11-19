import { Legal, legalMeta } from '../legal-pages';

export const metadata = legalMeta('imprint', 'en');

export default function Page() {
  return <Legal slug="imprint" lang="en" />;
}
