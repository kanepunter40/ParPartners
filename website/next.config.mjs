// Static export: `npm run build` writes plain HTML to out/, which GitHub Pages serves. See .github/workflows/site.yml.
import { fileURLToPath } from 'node:url';

// The legal pages import the app's own legal texts from ../src, so the build may read the parent folder.
const repo = fileURLToPath(new URL('..', import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: { root: repo },
  outputFileTracingRoot: repo
};
