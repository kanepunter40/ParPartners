import { Legal, legalMeta } from '../../legal-pages';

export const metadata = legalMeta('imprint', 'de');

export default function Page() {
  return <Legal slug="imprint" lang="de" />;
}
