// The launch waitlist on parpartners.app (table launch_waitlist, migration 0034).
// The website POSTs JSON here:
//   { action: 'join', email, lang, website }  sends a confirmation email (double opt-in). `website` is a hidden
//                                              field people never fill in; bots do, and get a quiet "ok".
//   { action: 'confirm', token }              from the link in that email: the address now counts
//   { action: 'leave', token }                from the link in any of our emails: the row is deleted
// Answers { ok: true } or { error: 'invalid_email' | 'too_many' | 'not_found' | 'send_failed' | 'bad_request' }.
//
// Secrets (Supabase dashboard > Edge Functions > Secrets):
//   RESEND_API_KEY   API key from resend.com (sending access for parpartners.app is enough)
//   WAITLIST_FROM    optional sender, default "PARtners <hello@parpartners.app>"; the domain must be verified in Resend
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Deploy with verify_jwt off: the website has no account, so the function checks the origin and rate-limits instead.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

type Lang = 'en' | 'de';

const SITE = 'https://parpartners.app';
const ORIGINS = [SITE, 'https://www.parpartners.app', 'http://localhost:3000', 'http://localhost:3101'];
const FROM = Deno.env.get('WAITLIST_FROM') ?? 'PARtners <hello@parpartners.app>';
const PER_HOUR = 5; // sign-ups per network per hour
const RESEND_AFTER_MS = 2 * 60 * 1000; // a repeat sign-up within 2 minutes doesn't send another email

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAIL: Record<Lang, { subject: string; hi: string; body: string; button: string; ignore: string; leave: string }> = {
  en: {
    subject: 'Confirm your place on the PARtners waitlist',
    hi: 'Thanks for signing up.',
    body: 'Confirm your email address and we’ll send you one email when PARtners is on Google Play.',
    button: 'Confirm my email',
    ignore: 'If you didn’t sign up, ignore this email and we won’t write to you again. Unconfirmed addresses are deleted after 30 days.',
    leave: 'Remove me from the list'
  },
  de: {
    subject: 'Bestätige deinen Platz auf der PARtners-Warteliste',
    hi: 'Danke für deine Anmeldung.',
    body: 'Bestätige deine E-Mail-Adresse, dann schicken wir dir eine E-Mail, sobald PARtners bei Google Play ist.',
    button: 'E-Mail bestätigen',
    ignore: 'Wenn du dich nicht angemeldet hast, ignoriere diese E-Mail; wir schreiben dir dann nicht wieder. Unbestätigte Adressen werden nach 30 Tagen gelöscht.',
    leave: 'Von der Liste streichen'
  }
};

const link = (param: 'confirm' | 'leave', token: string, lang: Lang) =>
  `${SITE}/waitlist/?${param}=${token}${lang === 'de' ? '&lang=de' : ''}`;

function confirmationEmail(lang: Lang, token: string) {
  const t = MAIL[lang];
  const confirm = link('confirm', token, lang);
  const leave = link('leave', token, lang);
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;background:#FBFAF7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1C302C">
<div style="max-width:480px;margin:0 auto;padding:40px 24px">
<p style="font-weight:700;font-size:17px;margin:0 0 32px">PARtners</p>
<p style="font-size:17px;line-height:1.55;margin:0 0 8px">${t.hi}</p>
<p style="font-size:17px;line-height:1.55;margin:0 0 28px">${t.body}</p>
<p style="margin:0 0 32px"><a href="${confirm}" style="display:inline-block;background:#1C302C;color:#FBFAF7;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px">${t.button}</a></p>
<p style="font-size:14px;line-height:1.5;color:#5B6662;margin:0 0 16px">${t.ignore}</p>
<p style="font-size:14px;margin:0"><a href="${leave}" style="color:#5B6662">${t.leave}</a></p>
</div></body></html>`;
  const text = `${t.hi}\n\n${t.body}\n\n${t.button}: ${confirm}\n\n${t.ignore}\n\n${t.leave}: ${leave}\n`;
  return { subject: t.subject, html, text, leave };
}

async function send(to: string, lang: Lang, token: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const mail = confirmationEmail(lang, token);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: { 'List-Unsubscribe': `<${mail.leave}>` }
    })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Keyed hash of the caller's IP address, so rate limiting never stores the address itself. */
async function ipHash(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const secret = new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`launch-waitlist:${ip}`));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function join(req: Request, body: Record<string, unknown>) {
  if (typeof body.website === 'string' && body.website) return { ok: true }; // honeypot
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (email.length > 254 || !EMAIL_RE.test(email)) return { error: 'invalid_email' };
  const lang: Lang = body.lang === 'de' ? 'de' : 'en';

  // Tidy up: attempts older than a day, unconfirmed sign-ups older than 30 days
  const now = Date.now();
  await sb.from('launch_waitlist_attempts').delete().lt('at', new Date(now - 864e5).toISOString());
  await sb.from('launch_waitlist').delete().is('confirmed_at', null).lt('created_at', new Date(now - 30 * 864e5).toISOString());

  const ip = await ipHash(req);
  const { count } = await sb
    .from('launch_waitlist_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ip)
    .gt('at', new Date(now - 36e5).toISOString());
  if ((count ?? 0) >= PER_HOUR) return { error: 'too_many' };
  await sb.from('launch_waitlist_attempts').insert({ ip_hash: ip });

  const { data: row } = await sb.from('launch_waitlist').select('id, confirmed_at, sent_at').eq('email', email).maybeSingle();
  // Already confirmed: say ok without emailing, so the form doesn't reveal who is on the list
  if (row?.confirmed_at) return { ok: true };
  if (row?.sent_at && now - Date.parse(row.sent_at) < RESEND_AFTER_MS) return { ok: true };

  const token = crypto.randomUUID();
  const { error } = row
    ? await sb.from('launch_waitlist').update({ token, lang }).eq('id', row.id)
    : await sb.from('launch_waitlist').insert({ email, lang, token });
  if (error) throw error;

  try {
    await send(email, lang, token);
  } catch (e) {
    console.error(e);
    return { error: 'send_failed' };
  }
  await sb.from('launch_waitlist').update({ sent_at: new Date().toISOString() }).eq('token', token);
  return { ok: true };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function confirm(token: string) {
  const { data } = await sb.from('launch_waitlist').select('id, confirmed_at').eq('token', token).maybeSingle();
  if (!data) return { error: 'not_found' };
  if (!data.confirmed_at) await sb.from('launch_waitlist').update({ confirmed_at: new Date().toISOString() }).eq('id', data.id);
  return { ok: true };
}

async function leave(token: string) {
  // Deleting a row that's already gone is fine: the result is the same
  await sb.from('launch_waitlist').delete().eq('token', token);
  return { ok: true };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const cors = {
    'Access-Control-Allow-Origin': ORIGINS.includes(origin) ? origin : SITE,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin'
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method !== 'POST' || !ORIGINS.includes(origin)) return reply({ error: 'bad_request' }, 400);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: 'bad_request' }, 400);
  }

  try {
    const token = typeof body.token === 'string' && UUID_RE.test(body.token) ? body.token : null;
    let result: { ok?: boolean; error?: string };
    if (body.action === 'join') result = await join(req, body);
    else if (body.action === 'confirm' && token) result = await confirm(token);
    else if (body.action === 'leave' && token) result = await leave(token);
    else return reply({ error: 'bad_request' }, 400);
    const status = result.ok ? 200 : result.error === 'too_many' ? 429 : result.error === 'send_failed' ? 502 : 400;
    return reply(result, status);
  } catch (e) {
    console.error(e);
    return reply({ error: 'server' }, 500);
  }
});
