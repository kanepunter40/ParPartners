'use client';

// GitHub Pages serves 404.html for every path it doesn't know, which is how /join/<code> invite links land here.
// Phones with the app never see this: Android opens /join/ links straight in the app.

import { useEffect, useState } from 'react';
import { Footer, Header, useLang, withLang } from './chrome';

const PLAY = 'https://play.google.com/store/apps/details?id=app.parpartners';

const TEXT = {
  en: {
    inviteTitle: 'Invite · PARtners',
    invited: 'You’re invited to a round',
    invitedP: 'Someone wants you in their group on PARtners, the app for finding people to play golf with. Install the app, then open this link again to join.',
    get: 'Get PARtners on Google Play',
    code: 'Invite code',
    missing: 'Page not found',
    home: 'Go to the PARtners home page'
  },
  de: {
    inviteTitle: 'Einladung · PARtners',
    invited: 'Du bist zu einer Runde eingeladen',
    invitedP: 'Jemand möchte dich in seiner Gruppe bei PARtners haben, der App, um Mitspieler für Golf zu finden. Installiere die App und öffne diesen Link dann noch einmal, um beizutreten.',
    get: 'PARtners bei Google Play laden',
    code: 'Einladungscode',
    missing: 'Seite nicht gefunden',
    home: 'Zur PARtners-Startseite'
  }
};

export default function Missing() {
  const [lang, choose] = useLang();
  // undefined until the browser has read the address; null when it isn't an invite link
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const t = TEXT[lang];

  useEffect(() => {
    setCode(location.pathname.match(/^\/join\/([A-Za-z0-9_-]{1,64})\/?$/)?.[1] ?? null);
  }, []);

  return (
    <>
      <title>{code ? t.inviteTitle : 'PARtners'}</title>
      <Header lang={lang} choose={choose} />
      <main className="missing wrap">
        {code && (
          <>
            <h1>{t.invited}</h1>
            <p className="lead">{t.invitedP}</p>
            <p><a className="button" href={PLAY}>{t.get}</a></p>
            <p className="code">{t.code}: <code>{code}</code></p>
          </>
        )}
        {code === null && (
          <>
            <h1>{t.missing}</h1>
            <p><a href={withLang('/', lang)}>{t.home}</a></p>
          </>
        )}
      </main>
      <Footer lang={lang} />
    </>
  );
}
