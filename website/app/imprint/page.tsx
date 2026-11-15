import { IMPRINT } from '../../../src/app/pages/legal/legal-texts';
import { IMPRINT_DE } from '../../../src/app/pages/legal/legal-texts.de';
import { Doc, LegalPage } from '../legal';

export default function Page() {
  return <LegalPage slug="imprint" titles={['Imprint · PARtners', 'Impressum · PARtners']} en={<Doc doc={IMPRINT} lang="en" />} de={<Doc doc={IMPRINT_DE} lang="de" />} />;
}
