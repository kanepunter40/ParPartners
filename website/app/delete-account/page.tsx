// Account deletion: Google Play requires a page that works without the app installed.
import { CONTACT } from '../../../src/app/pages/legal/legal-texts';
import en from '../../../src/app/i18n/en.json';
import de from '../../../src/app/i18n/de.json';
import { LegalPage } from '../legal';

const Mail = ({ subject }: { subject: string }) => <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(subject)}`}>{CONTACT}</a>;

const English = (
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

const German = (
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

export default function Page() {
  return <LegalPage slug="delete-account" titles={['Delete your account · PARtners', 'Konto löschen · PARtners']} en={English} de={German} />;
}
