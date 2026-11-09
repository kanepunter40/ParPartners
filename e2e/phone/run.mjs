// Phone tests: drives the PARtners debug build on a connected Android phone, as the signed-in player.
//
//   npm run test:phone            (phone on USB or Wi-Fi debugging, debug build installed, signed in)
//   PHONE=192.168.2.126:5555 npm run test:phone   (pick a device when several are connected)
//
// Playwright talks to the app's WebView through adb, so taps happen inside the app without
// Android input injection (which Xiaomi blocks). Android's own screens (permission prompts,
// share sheet, calendar, push) can't be driven and aren't tested here.
// Screenshots of every step go to e2e/phone/results/<time>/.
// Anything the tests create (a round, a saved search) is removed again at the end.

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import pw from 'playwright-core';

const { _android } = pw;
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const outDir = join(here, 'results', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
mkdirSync(outDir, { recursive: true });

// --- English text, so tests read like the app -----------------------------------------------
const en = JSON.parse(readFileSync(join(root, 'src/app/i18n/en.json'), 'utf8'));
const de = JSON.parse(readFileSync(join(root, 'src/app/i18n/de.json'), 'utf8'));
const t = (key, dict = en) => key.split('.').reduce((n, k) => n?.[k], dict);
/** An i18n key left untranslated on screen, e.g. "round.share" */
const RAW_KEY = /\b(?:common|home|rounds|round|find|create|card|scores|profile|settings|alerts|free|chat|weather|format|notifications|server|tabs)\.[a-z][A-Za-z]+(?:\.[a-z][A-Za-z]+)*\b/;

// --- adb ------------------------------------------------------------------------------------
const adbPath = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe') : 'adb';
spawnSync(adbPath, ['start-server'], { stdio: 'ignore' });

// --- tiny runner ----------------------------------------------------------------------------
const results = [];
let device, page, shot = 0;

async function screenshot(name) {
  const file = join(outDir, `${String(++shot).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
  try { await device.screenshot({ path: file }); } catch { /* a missing screenshot shouldn't fail a test */ }
  return file;
}

async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    await screenshot(name);
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    const file = await screenshot('FAIL ' + name);
    results.push({ name, ok: false, ms: Date.now() - started, error: e.message.split('\n')[0], file });
    console.log(`  ✗ ${name}\n      ${e.message.split('\n')[0]}`);
  }
}

function expect(cond, message) {
  if (!cond) throw new Error(message);
}

// --- app helpers ----------------------------------------------------------------------------
let origin = '';
/** The first visible match: Ionic keeps earlier pages in the DOM, hidden. */
const visible = (selector) => page.locator(selector).filter({ visible: true }).first();
const byText = (selector, text) => page.locator(selector, { hasText: text }).filter({ visible: true }).first();

async function goto(path) {
  await page.goto(origin + path);
  await page.locator('ion-router-outlet').first().waitFor();
  await page.waitForTimeout(800);
}

/** Tab buttons by their icon (the tab name is a property, not an attribute). */
const TAB_ICON = { home: 'home', rounds: 'calendar', find: 'search', scores: 'golf', profile: 'person' };
const tabButton = (name) => visible(`ion-tab-button:has(ion-icon[name^="${TAB_ICON[name]}"])`);

async function tab(name) {
  // Pages outside the tabs (Settings, a round) have no tab bar: go there directly
  if (!(await page.locator('ion-tab-bar').filter({ visible: true }).count())) await goto('/tabs/' + name);
  await tabButton(name).click();
  await page.waitForURL(new RegExp(`/tabs/${name}`));
  await page.waitForTimeout(700);
}

/** Screen text in the visible page; fails if an error is shown or a translation is missing. */
async function checkScreen(what) {
  const text = await page.evaluate(() => document.body.innerText);
  const raw = text.match(RAW_KEY);
  expect(!raw, `${what}: untranslated text "${raw?.[0]}"`);
  const alerts = await page.locator('[role="alert"]').filter({ visible: true }).allInnerTexts();
  const errors = alerts.map((a) => a.trim()).filter(Boolean);
  expect(!errors.length, `${what}: error shown: ${errors[0]}`);
}

async function setLanguage(name) {
  await goto('/settings');
  await byText('button[role="radio"]', name).click();
  await page.waitForTimeout(400);
}

// --- tests ----------------------------------------------------------------------------------
let originalLanguage = 'English';
let roundId = null;
let roundDeleted = false;
let searchesBefore = new Set();
/** Text of the saved search the test added (null: it matched one the player already had). */
let addedSearch = null;

/** The saved searches listed on /alerts, as their row text. Waits for the list or the empty state. */
async function savedSearches() {
  await page.locator('button.open, h2').filter({ visible: true }).first().waitFor();
  await page.waitForTimeout(300);
  return (await page.locator('button.open').filter({ visible: true }).allInnerTexts()).map((x) => x.trim());
}

async function run() {
  const devices = await _android.devices();
  expect(devices.length, 'No phone found. Plug it in or connect with adb, then try again.');
  device = devices.find((d) => d.serial() === process.env.PHONE) ?? devices[0];
  console.log(`Phone ${device.serial()} (${device.model()})\nScreenshots: ${outDir}\n`);

  await step('App starts signed in', async () => {
    await device.shell('am force-stop app.parpartners');
    await device.shell('am start -n app.parpartners/.MainActivity');
    const webview = await device.webView({ pkg: 'app.parpartners' }, { timeout: 20000 });
    page = await webview.page();
    page.setDefaultTimeout(10000);
    await page.waitForURL(/\/(tabs|welcome|onboarding)/, { timeout: 20000 });
    origin = new URL(page.url()).origin;
    expect(page.url().includes('/tabs/'), `Not signed in (on ${new URL(page.url()).pathname}). Sign in on the phone first.`);
    await visible('ion-tab-bar').waitFor();
  });
  if (!page) return;

  await step('Switch to English for the tests', async () => {
    await goto('/settings');
    originalLanguage = (await visible('button[role="radio"][aria-checked="true"]').innerText()).replace('✓', '').trim();
    await setLanguage('English');
  });

  for (const name of ['home', 'rounds', 'find', 'scores', 'profile']) {
    await step(`Tab ${t('tabs.' + name)} loads`, async () => {
      await tab(name);
      await page.waitForTimeout(1200);  // data loads after the tab shows
      await checkScreen(t('tabs.' + name));
    });
  }

  await step('Selected tab is marked', async () => {
    await tab('scores');
    const icon = await visible('ion-tab-button.tab-selected ion-icon').getAttribute('name');
    expect(icon === 'golf', `selected tab icon is "${icon}" (expected the filled "golf")`);
  });

  await step('Start a scorecard is at the top of Scores', async () => {
    await tab('scores');
    const button = visible(`ion-button:has-text("${t('scores.start')}")`);
    const firstCard = visible('a.item');
    if (await firstCard.count()) {
      const [b, c] = [await button.boundingBox(), await firstCard.boundingBox()];
      expect(b && c && b.y < c.y, 'the button is below the first card');
    }
  });

  await step('Post a test round (invite only)', async () => {
    await goto('/create');
    await visible('ion-searchbar input').fill('Golf');
    await visible('button.sug').click();
    await byText('button.opt', t('create.inviteOnly')).click();
    await visible('ion-textarea textarea').fill('Automated phone test. Deleted again straight away.');
    await byText('ion-button', t('create.submit')).click();
    await page.waitForURL(/\/round\/[0-9a-f-]{36}$/, { timeout: 15000 });
    roundId = page.url().split('/round/')[1];
    await byText('ion-button', t('round.share')).waitFor();
    await checkScreen('round page');
  });

  if (roundId) {
    await step('Share link has the new 16-character invite code', async () => {
      // Catch the share instead of opening Android's share sheet
      await page.evaluate(() => {
        window.__shared = null;
        navigator.share = async (data) => { window.__shared = data; };
      });
      await byText('ion-button', t('round.share')).click();
      await page.waitForFunction(() => window.__shared, null, { timeout: 8000 });
      const url = await page.evaluate(() => window.__shared.url);
      expect(/\/join\/[0-9a-f]{16}$/.test(url), `share link was ${url}`);
    });

    await step('Delete the test round', async () => {
      await deleteTestRound();
    });
  }

  await step('Save a search in Find', async () => {
    await goto('/alerts');
    searchesBefore = new Set(await savedSearches());
    await tab('find');
    await page.waitForTimeout(1500);
    await byText('ion-button', t('alerts.save')).click();
    await byText('ion-button', t('alerts.saved')).waitFor();
    await checkScreen('Find');
  });

  await step('Reopen a saved search from Saved searches', async () => {
    await byText('a', t('alerts.manage')).click();
    await page.waitForURL(/\/alerts$/);
    const after = await savedSearches();
    addedSearch = after.find((x) => !searchesBefore.has(x)) ?? null;
    expect(after.length > 0, 'no saved searches listed');
    await page.locator('button.open').filter({ visible: true }).first().click();
    await page.waitForURL(/\/tabs\/find/);
    await byText('ion-button', t('alerts.saved')).waitFor();
  });

  await step('Scorecard par button', async () => {
    await tab('scores');
    const card = visible('a.item');
    if (!(await card.count())) return;  // no cards on this account
    await card.click();
    await page.waitForURL(/\/scorecard\//);
    const parButton = visible('button.par-btn');
    await parButton.waitFor();
    if (await parButton.isDisabled()) {
      // Par from the course data: fixed, no picker
      expect(!(await page.locator('.pars').filter({ visible: true }).count()), 'par picker shown for a course-data par');
    } else {
      await parButton.click();
      await visible('.pars').waitFor();
      await parButton.click();  // close it again without changing anything
    }
    await checkScreen('scorecard');
  });

  await step('German: tabs and screens translated', async () => {
    await setLanguage('Deutsch');
    for (const name of ['home', 'rounds', 'find', 'scores', 'profile']) {
      await tab(name);
      await page.waitForTimeout(1000);
      const label = (await tabButton(name).locator('ion-label').innerText()).trim();
      expect(label === t('tabs.' + name, de), `tab "${name}" says "${label}"`);
      await checkScreen(`${t('tabs.' + name, de)} (Deutsch)`);
      await screenshot(`deutsch ${name}`);
    }
  });
}

// --- clean-up -------------------------------------------------------------------------------
async function deleteTestRound() {
  if (!roundId || roundDeleted) return;
  if (!page.url().endsWith('/round/' + roundId)) await goto('/round/' + roundId);
  // Either language: clean-up can run after the German step
  await byText('ion-button', new RegExp(`^\\s*(${t('round.delete')}|${t('round.delete', de)})\\s*$`)).click();
  await byText('ion-button', new RegExp(`${t('round.deleteConfirm')}|${t('round.deleteConfirm', de)}`)).click();
  await page.waitForURL(/\/tabs\/rounds/, { timeout: 10000 });
  roundDeleted = true;
}

async function cleanUp() {
  if (!page) return;
  if (roundId && !roundDeleted) {
    try { await deleteTestRound(); console.log('  cleaned up: test round deleted'); }
    catch (e) { console.log(`  ! could not delete the test round ${roundId}: ${e.message.split('\n')[0]}`); }
  }
  if (addedSearch) {
    try {
      // Only the row the test added, never one the player saved themselves
      await goto('/alerts');
      await savedSearches();
      const [where, details] = [addedSearch.split('\n')[0], addedSearch.split('\n').pop()];
      const row = page.locator('.row').filter({ visible: true })
        .filter({ has: page.locator('button.open', { hasText: where }) })
        .filter({ hasText: details }).first();
      await row.locator('ion-button').click();
      await page.waitForTimeout(800);
      console.log('  cleaned up: test saved search deleted');
    } catch (e) { console.log(`  ! could not delete the test saved search: ${e.message.split('\n')[0]}`); }
  }
  try { await setLanguage(originalLanguage); } catch { /* leave it */ }
  try { await tab('home'); } catch { /* leave it */ }
}

// --- go -------------------------------------------------------------------------------------
try {
  await run();
} catch (e) {
  results.push({ name: 'Test run', ok: false, error: e.message.split('\n')[0] });
  console.log(`  ✗ ${e.message.split('\n')[0]}`);
} finally {
  await cleanUp();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
for (const f of failed) console.log(`  ✗ ${f.name}: ${f.error}${f.file ? `\n      ${f.file}` : ''}`);
process.exit(failed.length ? 1 : 0);
