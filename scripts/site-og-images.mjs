// Renders the link preview cards (website/public/og-en.png and og-de.png, 1200 × 630) from the real app screens.
// Run again after changing the screens or the wording: node scripts/site-og-images.mjs
import pw from 'playwright-core';
import { readFileSync } from 'node:fs';

const pub = new URL('../website/public/', import.meta.url);
const data = (file, type) => `data:${type};base64,${readFileSync(new URL(file, pub)).toString('base64')}`;

const TEXT = {
  en: { h: 'Find golf partners near you.', p: 'Open tee times nearby, a chat for every round and one shared scorecard. Free, no ads.' },
  de: { h: 'Golfpartner in deiner Nähe finden.', p: 'Freie Startzeiten in der Nähe, ein Chat für jede Runde und eine gemeinsame Scorekarte. Kostenlos, ohne Werbung.' }
};

const card = (lang) => `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300&family=Hanken+Grotesk:wght@400;600;700&display=swap">
<style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; background: #FBFAF7; color: #1C302C; font-family: 'Hanken Grotesk', sans-serif;
    display: grid; grid-template-columns: 1fr 520px; gap: 40px; padding: 0 0 0 72px; }
  .copy { display: flex; flex-direction: column; justify-content: center; gap: 24px; }
  .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 26px; }
  .brand img { width: 44px; height: 44px; }
  h1 { font: 300 66px/1.02 'Newsreader', Georgia, serif; letter-spacing: -0.015em; }
  p { font-size: 24px; line-height: 1.4; color: #5B6662; max-width: 30ch; }
  .shots { position: relative; background: #F3F1EA; box-shadow: inset 1px 0 0 #E2DDD0; display: flex; gap: 24px; padding: 48px 0 0 40px; }
  .shot { width: 210px; flex: none; border-radius: 22px; overflow: hidden; border: 2px solid rgba(28,48,44,.22); box-shadow: 0 22px 44px -26px rgba(28,48,44,.5); align-self: flex-start; }
  .shot img { display: block; width: 100%; }
  .shot.back { margin-top: 60px; }
</style></head><body>
  <div class="copy">
    <div class="brand"><img src="${data('favicon.svg', 'image/svg+xml')}" alt=""> PARtners</div>
    <h1>${TEXT[lang].h}</h1>
    <p>${TEXT[lang].p}</p>
  </div>
  <div class="shots">
    <div class="shot back"><img src="${data(`screens/${lang}/find.webp`, 'image/webp')}" alt=""></div>
    <div class="shot"><img src="${data(`screens/${lang}/home.webp`, 'image/webp')}" alt=""></div>
  </div>
</body></html>`;

const browser = await pw.chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const lang of ['en', 'de']) {
  await page.setContent(card(lang), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: new URL(`og-${lang}.png`, pub).pathname.replace(/^\/([A-Z]:)/, '$1') });
  console.log(`Wrote website/public/og-${lang}.png`);
}
await browser.close();
