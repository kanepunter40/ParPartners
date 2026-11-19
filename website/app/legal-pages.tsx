// The legal pages, each in English (/privacy/) and German (/de/privacy/).
// Privacy, terms and imprint come straight from the app's texts (src/app/pages/legal/legal-texts*.ts);
// the account deletion page (required by Google Play, works without the app) is written here.

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CONTACT, IMPRINT, PRIVACY, TERMS } from '../../src/app/pages/legal/legal-texts';
import { IMPRINT_DE, PRIVACY_DE, TERMS_DE } from '../../src/app/pages/legal/legal-texts.de';
import en from '../../src/app/i18n/en.json';
import de from '../../src/app/i18n/de.json';
import type { Lang } from './content';
import { Doc, LegalPage } from './legal';
import { pageMeta } from './seo';

const Mail = ({ subject }: { subject: string }) => <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(subject)}`}>{CONTACT}</a>;

const DELETE_EN = (
  <>
    <h1>Delete your PARtners account</h1>
    <p className="intro">You can delete your account and its data at any time, in the app or by email.</p>
    <section>
      <h2>In the app</h2>
      <p>On the <strong>Profile</strong> tab, tap the gear icon to open <strong>Settings</strong>, scroll down and tap <strong>{en.settings.deleteMine}</strong>, then tap again to confirm. Your account is deleted straight away.</p>
    </section>
    <section>
      <h2>By email</h2>
      <p>If you can’t use the app any more, email <Mail subject="Delete my PARtners account" /> from the address you signed up with and ask us to delete your account. We’ll do it within 30 days and confirm by email.</p>
    </section>
    <section>
      <h2>What is deleted</h2>
      <p>{en.settings.deleteText}</p>
      <p>Copies in our backups are overwritten within 7 days. Crash reports aren’t linked to your account and are deleted by Firebase Crashlytics after 90 days.</p>
    </section>
    <section>
      <h2>Only some of your data?</h2>
      <p>You can remove your photo, year of birth and gender yourself in <strong>Edit profile</strong>. For anything else, email <Mail subject="PARtners data request" />.</p>
    </section>
  </>
);

const DELETE_DE = (
  <>
    <h1>Dein PARtners-Konto löschen</h1>
    <p className="intro">Du kannst dein Konto und deine Daten jederzeit löschen, in der App oder per E-Mail.</p>
    <section>
      <h2>In der App</h2>
      <p>Tippe im Tab <strong>Profil</strong> auf das Zahnrad, um die <strong>Einstellungen</strong> zu öffnen, scroll nach unten und tippe auf <strong>{de.settings.deleteMine}</strong>, dann zur Bestätigung noch einmal. Dein Konto wird sofort gelöscht.</p>
    </section>
    <section>
      <h2>Per E-Mail</h2>
      <p>Wenn du die App nicht mehr nutzen kannst, schreib an <Mail subject="PARtners-Konto löschen" /> von der Adresse, mit der du dich registriert hast, und bitte uns, dein Konto zu löschen. Wir erledigen das innerhalb von 30 Tagen und bestätigen es per E-Mail.</p>
    </section>
    <section>
      <h2>Was gelöscht wird</h2>
      <p>{de.settings.deleteText}</p>
      <p>Kopien in unseren Sicherungen werden innerhalb von 7 Tagen überschrieben. Absturzberichte sind nicht mit deinem Konto verknüpft und werden von Firebase Crashlytics nach 90 Tagen gelöscht.</p>
    </section>
    <section>
      <h2>Nur einen Teil deiner Daten?</h2>
      <p>Dein Foto, Geburtsjahr und Geschlecht kannst du selbst unter <strong>Profil bearbeiten</strong> entfernen. Für alles andere schreib an <Mail subject="PARtners-Datenanfrage" />.</p>
    </section>
  </>
);

type Slug = 'privacy' | 'terms' | 'imprint' | 'delete-account';

const PAGES: Record<Slug, Record<Lang, { title: string; description: string; body: ReactNode }>> = {
  privacy: {
    en: { title: 'Privacy policy · PARtners', description: 'What PARtners stores about you, who can see it, how long we keep it and your rights under the GDPR.', body: <Doc doc={PRIVACY} lang="en" /> },
    de: { title: 'Datenschutzerklärung · PARtners', description: 'Was PARtners über dich speichert, wer es sehen kann, wie lange wir es aufbewahren und deine Rechte nach der DSGVO.', body: <Doc doc={PRIVACY_DE} lang="de" /> }
  },
  terms: {
    en: { title: 'Terms of service · PARtners', description: 'The rules for using PARtners, the app for finding people to play golf with.', body: <Doc doc={TERMS} lang="en" /> },
    de: { title: 'Nutzungsbedingungen · PARtners', description: 'Die Regeln für PARtners, die App, um Golfpartner zu finden.', body: <Doc doc={TERMS_DE} lang="de" /> }
  },
  imprint: {
    en: { title: 'Imprint · PARtners', description: 'Who runs PARtners and how to contact us.', body: <Doc doc={IMPRINT} lang="en" /> },
    de: { title: 'Impressum · PARtners', description: 'Wer PARtners betreibt und wie du uns erreichst.', body: <Doc doc={IMPRINT_DE} lang="de" /> }
  },
  'delete-account': {
    en: { title: 'Delete your account · PARtners', description: 'How to delete your PARtners account and its data, in the app or by email.', body: DELETE_EN },
    de: { title: 'Konto löschen · PARtners', description: 'So löschst du dein PARtners-Konto und deine Daten, in der App oder per E-Mail.', body: DELETE_DE }
  }
};

export const legalMeta = (slug: Slug, lang: Lang): Metadata => pageMeta(lang, `${slug}/`, PAGES[slug][lang].title, PAGES[slug][lang].description);

export function Legal({ slug, lang }: { slug: Slug; lang: Lang }) {
  return <LegalPage slug={slug} lang={lang}>{PAGES[slug][lang].body}</LegalPage>;
}
