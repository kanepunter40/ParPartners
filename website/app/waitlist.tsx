'use client';

// The launch waitlist form, and the words for it and for the /waitlist/ page.
// Sign-ups go to the launch-waitlist Edge Function (supabase/functions/launch-waitlist), which sends a
// confirmation email; an address only counts once its link is clicked (double opt-in).

import { useId, useState } from 'react';
import type { Lang } from './content';
import { withLang } from './chrome';

export const WAITLIST_URL = 'https://lhfelwqznsmzwmhgxlpi.supabase.co/functions/v1/launch-waitlist';

export const WAITLIST = {
  en: {
    label: 'Your email address',
    placeholder: 'you@example.com',
    button: 'Join the waitlist',
    sending: 'Sending…',
    note: ['We’ll email you once, when PARtners is on Google Play. See our ', 'privacy policy', '.'],
    sent: 'Check your inbox and click the link in our email to confirm.',
    errors: {
      invalid_email: 'That email address doesn’t look right.',
      too_many: 'Too many sign-ups from your network. Please try again in an hour.',
      other: 'Something went wrong. Please try again later.'
    },
    page: {
      title: 'Waitlist · PARtners',
      working: 'One moment…',
      confirmed: ['You’re on the list', 'We’ll email you when PARtners is on Google Play.'],
      left: ['You’re off the list', 'We’ve deleted your email address and won’t write to you again.'],
      expired: ['This link has expired', 'Links stop working after 30 days, or once you’ve asked for a new one. You can sign up again on the home page.'],
      failed: ['Something went wrong', 'Please open the link from the email again in a little while.'],
      home: 'Go to the PARtners home page'
    }
  },
  de: {
    label: 'Deine E-Mail-Adresse',
    placeholder: 'du@beispiel.de',
    button: 'Auf die Warteliste',
    sending: 'Wird gesendet …',
    note: ['Wir schreiben dir einmal, sobald PARtners bei Google Play ist. Mehr in der ', 'Datenschutzerklärung', '.'],
    sent: 'Schau in dein Postfach und klick auf den Link in unserer E-Mail, um zu bestätigen.',
    errors: {
      invalid_email: 'Diese E-Mail-Adresse sieht nicht richtig aus.',
      too_many: 'Zu viele Anmeldungen aus deinem Netz. Bitte versuch es in einer Stunde noch einmal.',
      other: 'Etwas ist schiefgelaufen. Bitte versuch es später noch einmal.'
    },
    page: {
      title: 'Warteliste · PARtners',
      working: 'Einen Moment …',
      confirmed: ['Du stehst auf der Liste', 'Wir schreiben dir, sobald PARtners bei Google Play ist.'],
      left: ['Du bist nicht mehr auf der Liste', 'Wir haben deine E-Mail-Adresse gelöscht und schreiben dir nicht wieder.'],
      expired: ['Dieser Link ist abgelaufen', 'Links gelten 30 Tage oder bis du einen neuen angefordert hast. Du kannst dich auf der Startseite neu anmelden.'],
      failed: ['Etwas ist schiefgelaufen', 'Bitte öffne den Link aus der E-Mail etwas später noch einmal.'],
      home: 'Zur PARtners-Startseite'
    }
  }
};

export async function callWaitlist(body: Record<string, unknown>): Promise<{ ok?: boolean; error?: string }> {
  try {
    const res = await fetch(WAITLIST_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return await res.json();
  } catch {
    return { error: 'other' };
  }
}

type State = { step: 'idle' | 'sending' | 'sent' } | { step: 'error'; error: string };

export function WaitlistForm({ lang }: { lang: Lang }) {
  const id = useId();
  const [state, setState] = useState<State>({ step: 'idle' });
  const t = WAITLIST[lang];

  if (state.step === 'sent') {
    return (
      <p className="join-sent" role="status">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg>
        {t.sent}
      </p>
    );
  }

  const error = state.step === 'error' ? (t.errors as Record<string, string>)[state.error] ?? t.errors.other : null;

  return (
    <form
      className="join"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setState({ step: 'sending' });
        const res = await callWaitlist({ action: 'join', email: data.get('email'), website: data.get('website'), lang });
        setState(res.ok ? { step: 'sent' } : { step: 'error', error: res.error ?? 'other' });
      }}
    >
      <label className="sr" htmlFor={id}>{t.label}</label>
      <div className="join-row">
        <input id={id} name="email" type="email" required maxLength={254} autoComplete="email" placeholder={t.placeholder} aria-invalid={state.step === 'error' && state.error === 'invalid_email'} />
        <button className="btn" type="submit" disabled={state.step === 'sending'}>{state.step === 'sending' ? t.sending : t.button}</button>
      </div>
      {/* People never see this field; bots fill it in */}
      <div className="hp" aria-hidden="true">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <p className={error ? 'join-note err' : 'join-note'} aria-live="polite">
        {error ?? <>{t.note[0]}<a href={withLang('/privacy/', lang)}>{t.note[1]}</a>{t.note[2]}</>}
      </p>
    </form>
  );
}
