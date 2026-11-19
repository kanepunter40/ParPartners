import Home from '../home';
import { CONTENT } from '../content';
import { AppJsonLd, pageMeta } from '../seo';

export const metadata = pageMeta('de', '', CONTENT.de.title, CONTENT.de.description);

export default function Page() {
  return (
    <>
      <AppJsonLd lang="de" />
      <Home lang="de" />
    </>
  );
}
