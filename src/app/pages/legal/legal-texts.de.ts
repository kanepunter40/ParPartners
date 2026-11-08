// German versions of the legal texts. DRAFT, like the English ones: needs a postal address and a lawyer's review.
import { CONTACT, LegalDoc } from './legal-texts';

export const PRIVACY_DE: LegalDoc = {
  title: 'Datenschutzerklärung',
  updated: '9. November 2026',
  intro: 'Par Partners hilft Golfern, Mitspieler zu finden. Hier erklären wir, was wir über dich speichern, wer es sehen kann und was du tun kannst. Kurz gesagt: Wir speichern nur, was die App zum Funktionieren braucht, verkaufen deine Daten nie, und es gibt weder Werbung noch Tracking.',
  sections: [
    {
      heading: 'Verantwortlicher',
      body: [`Par Partners wird von Kane Punter als privates Projekt betrieben. Bei allen Fragen zu deinen Daten schreib an ${CONTACT}.`]
    },
    {
      heading: 'Was wir speichern',
      body: [
        'Dein Konto: deine E-Mail-Adresse und, falls du eins nutzt, dein Passwort (nur als sicherer Hash gespeichert). Wenn du dich mit Google anmeldest, erhalten wir deinen Namen und deine E-Mail-Adresse von Google.',
        'Dein Profil: Name, Foto (freiwillig), Heimatplatz, Handicap, Sprachen, wann du gern spielst, Rundenlänge und wie ehrgeizig du spielst. Geburtsjahr und Geschlecht sind freiwillig.',
        'Was du in der App tust: Runden, die du einstellst oder denen du beitrittst, Beitrittsanfragen, Scorekarten und Ergebnisse, Freunde und Freundschaftsanfragen sowie die Mitteilungen, die wir dir schicken.',
        'Gäste: Wenn du jemanden ohne Par-Partners-Konto auf eine Scorekarte setzt, speichern wir den eingegebenen Namen und die Ergebnisse. Füge nur Leute hinzu, die damit einverstanden sind.'
      ]
    },
    {
      heading: 'Dein Standort',
      body: ['Wenn du es erlaubst, nutzt die App den Standort deines Handys, um Runden in deiner Nähe zu finden. Er wird mit der Suche übertragen und nicht gespeichert. Du kannst stattdessen jederzeit nach Platz suchen.']
    },
    {
      heading: 'Wer was sehen kann',
      body: [
        'Andere angemeldete Spieler sehen deinen Namen, dein Foto, Handicap, Heimatplatz, deine Sprachen und deine Spielweise. Alter und Geschlecht werden nur angezeigt, wenn du das unter „Profil bearbeiten“ einschaltest.',
        'Runden für „Spieler in der Nähe“ sehen angemeldete Spieler unter „Finden“. Runden „Nur mit Einladung“ sehen nur Leute mit dem Link.',
        'Eine Scorekarte sehen alle, die darauf stehen. Deine Freunde sehen auf ihrer Startseite deine abgeschlossenen Scorekarten, die Runden, die du einstellst oder denen du beitrittst, und neue Freundschaften.',
        'Deine E-Mail-Adresse wird anderen Spielern nie angezeigt.'
      ]
    },
    {
      heading: 'Dienste, die wir nutzen',
      body: [
        'Supabase speichert die Daten, Fotos und Konten der App auf Servern in Frankfurt am Main.',
        'Google: Wenn du „Weiter mit Google“ wählst, übernimmt Google die Anmeldung. Anmelde- und Bestätigungs-E-Mails werden derzeit über ein Gmail-Konto verschickt.',
        'Google Fonts: Die App lädt ihre Schriften von Servern von Google. Dabei sieht Google deine IP-Adresse. Wir planen, die Schriften künftig selbst auszuliefern.',
        'Namen und Lage der Golfplätze stammen von OpenStreetMap. An OpenStreetMap werden keine personenbezogenen Daten übermittelt.'
      ]
    },
    {
      heading: 'Rechtsgrundlage',
      body: ['Wir nutzen deine Daten, um dir die App bereitzustellen, für die du dich angemeldet hast (Art. 6 Abs. 1 lit. b DSGVO). Freiwillige Angaben wie Geburtsjahr, Geschlecht und Standort nutzen wir, weil du sie uns gegeben hast (Art. 6 Abs. 1 lit. a DSGVO); du kannst sie jederzeit entfernen.']
    },
    {
      heading: 'Wie lange wir Daten speichern',
      body: ['So lange du ein Konto hast. Wenn du dein Konto in den Einstellungen löschst, werden Profil, Foto, eigene Scorekarten, Freundschaften und Mitteilungen sofort entfernt. Anstehende Runden, die du organisierst, gehen an einen anderen Spieler, und deine Ergebnisse bleiben auf den Karten anderer Spieler als „Gelöschter Spieler“ stehen, damit deren Karten stimmen.']
    },
    {
      heading: 'Deine Rechte',
      body: [
        `Du kannst Auskunft über deine Daten verlangen, sie berichtigen oder löschen lassen, ihre Verarbeitung einschränken, ihr widersprechen oder sie mitnehmen. Schreib an ${CONTACT}; wir antworten innerhalb eines Monats.`,
        'Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren, zum Beispiel beim Landesbeauftragten für den Datenschutz und die Informationsfreiheit Baden-Württemberg.'
      ]
    },
    {
      heading: 'Alter',
      body: ['Par Partners ist für Menschen ab 16 Jahren.']
    },
    {
      heading: 'Änderungen',
      body: ['Wenn sich diese Erklärung wesentlich ändert, sagen wir dir in der App Bescheid, bevor die Änderung gilt.']
    }
  ]
};

export const TERMS_DE: LegalDoc = {
  title: 'Nutzungsbedingungen',
  updated: '9. November 2026',
  intro: 'Diese Bedingungen gelten, wenn du Par Partners nutzt. Mit dem Erstellen eines Kontos stimmst du ihnen zu.',
  sections: [
    {
      heading: 'Der Dienst',
      body: ['Par Partners hilft dir, Golfpartner zu finden, Runden zu organisieren und deine Schläge zu zählen. Die App ist kostenlos. Wir buchen keine Startzeiten und nehmen keine Zahlungen an: Greenfees und Buchungen laufen direkt zwischen dir und dem Golfclub.']
    },
    {
      heading: 'Dein Konto',
      body: ['Du musst mindestens 16 Jahre alt sein. Nutze deinen echten Namen, gib deine Anmeldedaten nicht weiter und sag uns Bescheid, wenn du glaubst, dass jemand anderes dein Konto nutzt.']
    },
    {
      heading: 'Spielen mit Leuten, die du hier triffst',
      body: [
        'Sei respektvoll, komm, wenn du zugesagt hast, und verlass eine Runde in der App, wenn du nicht kannst, damit der Platz für andere frei wird.',
        'Du entscheidest, mit wem du spielst. Wir prüfen weder Identität noch Handicap der Spieler und sind nicht verantwortlich für das, was auf oder neben dem Platz passiert. Halte dich an die Regeln und die Etikette des jeweiligen Clubs.'
      ]
    },
    {
      heading: 'Was nicht erlaubt ist',
      body: ['Andere Spieler belästigen, bedrohen oder täuschen; Fake-Konten anlegen oder sich als jemand anderes ausgeben; Runden einstellen, die es nicht gibt; Spam oder Werbung; und Versuche, die App zu stören, zu überlasten oder ihre Sicherheit zu umgehen. Konten, die das tun, können wir sperren oder entfernen.']
    },
    {
      heading: 'Was du einstellst',
      body: ['Die Rechte an dem, was du hinzufügst, etwa dein Foto und deine Hinweise, behältst du. Du erlaubst uns, es zu speichern und anderen Spielern so anzuzeigen, wie die App es braucht. Lade nur Fotos hoch, die du verwenden darfst.']
    },
    {
      heading: 'Verfügbarkeit',
      body: ['Wir geben uns Mühe, dass Par Partners läuft und deine Daten sicher sind, können aber nicht garantieren, dass die App immer verfügbar und fehlerfrei ist. Ergebnisse und Handicaps in der App sind für deinen eigenen Gebrauch und nicht offiziell.']
    },
    {
      heading: 'Haftung',
      body: ['Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Bei leichter Fahrlässigkeit haften wir nur für die Verletzung wesentlicher Pflichten, begrenzt auf den typischerweise vorhersehbaren Schaden. Im Übrigen ist die Haftung ausgeschlossen.']
    },
    {
      heading: 'Beenden',
      body: ['Du kannst dein Konto jederzeit in den Einstellungen löschen. Wir können den Dienst mit angemessener Frist einstellen.']
    },
    {
      heading: 'Änderungen und anwendbares Recht',
      body: [
        'Wenn sich diese Bedingungen wesentlich ändern, sagen wir dir in der App Bescheid, bevor sie gelten. Es gilt deutsches Recht.',
        `Fragen: ${CONTACT}`
      ]
    }
  ]
};
