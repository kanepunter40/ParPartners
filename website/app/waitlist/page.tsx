'use client';

// Where the links in waitlist emails land: /waitlist/?confirm=<token> or /waitlist/?leave=<token>.
// The page sends the token to the Edge Function itself (rather than the email linking to the function), so
// mail scanners that open links ahead of the reader don't confirm sign-ups on their own.

import { useEffect, useState } from 'react';
import { Footer, Header, useLang, withLang } from '../chrome';
import { WAITLIST, callWaitlist } from '../waitlist';

type Result = 'working' | 'confirmed' | 'left' | 'expired' | 'failed';

export default function Waitlist() {
  const [lang, choose] = useLang();
  const [result, setResult] = useState<Result>('working');
  const t = WAITLIST[lang].page;

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const action = q.has('confirm') ? 'confirm' : q.has('leave') ? 'leave' : null;
    if (!action) return setResult('expired');
    callWaitlist({ action, token: q.get(action) }).then((res) =>
      setResult(res.ok ? (action === 'confirm' ? 'confirmed' : 'left') : res.error === 'not_found' || res.error === 'bad_request' ? 'expired' : 'failed')
    );
  }, []);

  return (
    <>
      <title>{t.title}</title>
      <meta name="robots" content="noindex" />
      <Header lang={lang} choose={choose} />
      <main className="missing wrap" aria-live="polite">
        {result === 'working' ? (
          <p className="lead">{t.working}</p>
        ) : (
          <>
            <h1>{t[result][0]}</h1>
            <p className="lead">{t[result][1]}</p>
            <p><a href={withLang('/', lang)}>{t.home}</a></p>
          </>
        )}
      </main>
      <Footer lang={lang} />
    </>
  );
}
