import { TERMS } from '../../../src/app/pages/legal/legal-texts';
import { TERMS_DE } from '../../../src/app/pages/legal/legal-texts.de';
import { Doc, LegalPage } from '../legal';

export default function Page() {
  return <LegalPage slug="terms" titles={['Terms of service · PARtners', 'Nutzungsbedingungen · PARtners']} en={<Doc doc={TERMS} lang="en" />} de={<Doc doc={TERMS_DE} lang="de" />} />;
}
