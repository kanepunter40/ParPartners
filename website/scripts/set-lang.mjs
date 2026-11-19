// After `next build`: the site has one root layout, which writes <html lang="en"> on every page.
// The German pages live under out/de/, so mark them lang="de" for search engines and screen readers.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
let n = 0;
for (const file of walk('out/de').filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  const fixed = html.replace('<html lang="en"', '<html lang="de"');
  if (fixed === html) throw new Error(`No <html lang="en"> in ${file}`);
  writeFileSync(file, fixed);
  n++;
}
console.log(`Set lang="de" on ${n} German pages`);
