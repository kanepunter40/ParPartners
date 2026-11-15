import { PRIVACY } from '../../../src/app/pages/legal/legal-texts';
import { PRIVACY_DE } from '../../../src/app/pages/legal/legal-texts.de';
import { Doc, LegalPage } from '../legal';

export default function Page() {
  return <LegalPage slug="privacy" titles={['Privacy policy · PARtners', 'Datenschutzerklärung · PARtners']} en={<Doc doc={PRIVACY} lang="en" />} de={<Doc doc={PRIVACY_DE} lang="de" />} />;
}
