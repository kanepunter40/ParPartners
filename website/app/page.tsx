import Home from './home';
import { CONTENT } from './content';
import { AppJsonLd, pageMeta } from './seo';

export const metadata = pageMeta('en', '', CONTENT.en.title, CONTENT.en.description);

export default function Page() {
  return (
    <>
      <AppJsonLd lang="en" />
      <Home lang="en" />
    </>
  );
}
