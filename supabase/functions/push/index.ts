// Sends one notification (a row in `notifications`) to the player's phones with Firebase Cloud Messaging.
// Called by the notifications_send_push trigger (supabase/migrations/0016_push.sql), never by the app.
//
// Secrets (Supabase dashboard > Edge Functions > Secrets):
//   FIREBASE_SERVICE_ACCOUNT  the JSON key of a Firebase service account
//                             (Firebase console > Project settings > Service accounts > Generate new private key)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
// Deploy with verify_jwt off: the trigger authenticates with the x-push-secret header instead.

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';
import { importPKCS8, SignJWT } from 'npm:jose@5.9.6';

type Locale = 'en' | 'de';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false }
});

// Same wording as the in-app list (src/app/i18n/*.json > notifications.type)
const TEXT: Record<Locale, Record<string, string>> = {
  en: {
    request_received: '{who} asked to join your round',
    request_accepted: "You're in. {who} accepted your request",
    request_declined: "Your request wasn't accepted this time",
    player_joined: '{who} joined your round',
    player_left: '{who} left your round',
    round_cancelled: '{who} cancelled the round',
    friend_request: '{who} sent you a friend request',
    friend_accepted: '{who} accepted your friend request',
    host_handover: "The host left PARtners. You're hosting this round now",
    round_reminder: 'Reminder: you tee off {when}',
    other: 'Update on a round',
    aPlayer: 'A player'
  },
  de: {
    request_received: '{who} möchte bei deiner Runde mitspielen',
    request_accepted: 'Du bist dabei. {who} hat deine Anfrage angenommen',
    request_declined: 'Deine Anfrage wurde dieses Mal nicht angenommen',
    player_joined: '{who} ist deiner Runde beigetreten',
    player_left: '{who} hat deine Runde verlassen',
    round_cancelled: '{who} hat die Runde abgesagt',
    friend_request: '{who} hat dir eine Freundschaftsanfrage geschickt',
    friend_accepted: '{who} hat deine Freundschaftsanfrage angenommen',
    host_handover: 'Der Gastgeber hat PARtners verlassen. Du bist jetzt Gastgeber dieser Runde',
    round_reminder: 'Erinnerung: Abschlag {when}',
    other: 'Neuigkeit zu einer Runde',
    aPlayer: 'Ein Spieler'
  }
};

/** "tomorrow at 09:10" / "today at 15:30", in German time (where the courses are). */
function when(teeTime: string, locale: Locale): string {
  const tz = 'Europe/Berlin';
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
  const tee = new Date(teeTime);
  const time = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(tee);
  const today = day(new Date()) === day(tee);
  if (locale === 'de') return `${today ? 'heute' : 'morgen'} um ${time} Uhr`;
  return `${today ? 'today' : 'tomorrow'} at ${time}`;
}

// --- Firebase access token (an OAuth token from the service account, cached until shortly before it expires) ---
let cached: { token: string; until: number } | null = null;

async function accessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  if (cached && Date.now() < cached.until) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(sa.private_key, 'RS256'));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  const { access_token, expires_in } = await res.json();
  cached = { token: access_token, until: Date.now() + (expires_in - 300) * 1000 };
  return access_token;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  // Only the database trigger knows this secret
  const { data: secret } = await sb.rpc('push_webhook_secret');
  if (!secret || req.headers.get('x-push-secret') !== secret) return new Response('Forbidden', { status: 403 });

  const saJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!saJson) return new Response('Push not set up (FIREBASE_SERVICE_ACCOUNT missing)', { status: 200 });
  const sa = JSON.parse(saJson);

  const { id } = await req.json();
  const { data: n, error } = await sb
    .from('notifications')
    .select('id, user_id, type, round_id, actor:profiles!notifications_actor_id_fkey(display_name), rounds(tee_time, courses(name))')
    .eq('id', id)
    .maybeSingle();
  if (error || !n) return new Response('Notification not found', { status: 404 });

  const { data: devices } = await sb.from('device_tokens').select('token, locale').eq('user_id', n.user_id);
  if (!devices?.length) return new Response('No devices', { status: 200 });

  const actor = (n as any).actor?.display_name as string | undefined;
  const round = (n as any).rounds as { tee_time: string; courses: { name: string } } | null;
  const route = n.type === 'friend_request' || n.type === 'friend_accepted' ? '/friends'
    : n.round_id ? `/round/${n.round_id}` : '/notifications';

  const token = await accessToken(sa);
  let sent = 0;
  for (const d of devices) {
    const locale: Locale = d.locale === 'de' ? 'de' : 'en';
    const t = TEXT[locale];
    const body = (t[n.type] ?? t.other)
      .replace('{who}', actor ?? t.aPlayer)
      .replace('{when}', round ? when(round.tee_time, locale) : '');

    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: d.token,
          notification: { title: round?.courses.name ?? 'PARtners', body },
          data: { route, notification_id: n.id },
          android: { priority: 'high', notification: { channel_id: 'default', icon: 'ic_stat_flag', color: '#2E5F5A' } }
        }
      })
    });
    if (res.ok) { sent++; continue; }
    const err = await res.text();
    // The app was uninstalled or the token replaced: forget this phone
    if (res.status === 404 || err.includes('UNREGISTERED') || err.includes('registration-token-not-registered')) {
      await sb.from('device_tokens').delete().eq('token', d.token);
    } else {
      console.error('FCM', res.status, err);
    }
  }
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
});
