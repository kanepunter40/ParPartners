import { Legal, legalMeta } from '../../legal-pages';

export const metadata = legalMeta('privacy', 'de');

export default function Page() {
  return <Legal slug="privacy" lang="de" />;
}
