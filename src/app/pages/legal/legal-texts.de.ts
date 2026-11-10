// German versions of the legal texts. DRAFT, like the English ones: needs a postal address and a lawyer's review.
import { ADDRESS, CONTACT, LegalDoc, OPERATOR } from './legal-texts';

export const PRIVACY_DE: LegalDoc = {
  title: 'Datenschutzerklärung',
  updated: '9. November 2026',
  intro: 'PARtners hilft Golfern, Mitspieler zu finden. Hier erklären wir, was wir über dich speichern, wer es sehen kann und was du tun kannst. Kurz gesagt: Wir speichern nur, was die App zum Funktionieren braucht, verkaufen deine Daten nie, und es gibt weder Werbung noch Tracking.',
  sections: [
    {
      heading: 'Verantwortlicher',
      body: [
        `PARtners wird von ${OPERATOR} als privates Projekt betrieben. Verantwortlicher im Sinne der DSGVO ist ${OPERATOR}.`,
        `${OPERATOR}, ${ADDRESS}, Deutschland. E-Mail: ${CONTACT}`
      ]
    },
    {
      heading: 'Was wir speichern',
      body: [
        'Dein Konto: deine E-Mail-Adresse und, falls du eins nutzt, dein Passwort (nur als sicherer Hash gespeichert). Wenn du dich mit Google anmeldest, erhalten wir deinen Namen und deine E-Mail-Adresse von Google.',
        'Dein Profil: Name, Foto (freiwillig), Heimatplatz, Handicap, Sprachen, wann du gern spielst, Rundenlänge und wie ehrgeizig du spielst. Geburtsjahr und Geschlecht sind freiwillig.',
        'Was du in der App tust: Runden, die du einstellst oder denen du beitrittst, Beitrittsanfragen, Scorekarten und Ergebnisse, Freunde und Freundschaftsanfragen sowie die Mitteilungen, die wir dir schicken.',
        'Gäste: Wenn du jemanden ohne PARtners-Konto auf eine Scorekarte setzt, speichern wir den eingegebenen Namen und die Ergebnisse. Füge nur Leute hinzu, die damit einverstanden sind.',
        'Sicherheit: Spieler, die du blockierst, und Meldungen, die du sendest. Wenn dich jemand meldet, speichern wir die Meldung und den angegebenen Grund. Wir nutzen Meldungen nur, um PARtners sicher zu halten; die gemeldete Person erfährt nie, wer sie gemeldet hat.',
        'Push-Mitteilungen: Wenn du sie erlaubst, ein Token, das dein Handy beim Benachrichtigungsdienst kennzeichnet, und deine App-Sprache.'
      ]
    },
    {
      heading: 'Welche Angaben nötig sind',
      body: ['Für ein Konto brauchst du eine E-Mail-Adresse (oder ein Google-Konto) und einen Namen. Ohne diese Angaben können wir dir kein Konto anlegen. Alles andere in deinem Profil ist freiwillig.']
    },
    {
      heading: 'Technische Daten bei der Nutzung',
      body: ['Immer wenn die App mit unseren Servern kommuniziert, speichert Supabase technische Angaben: deine IP-Adresse, den Zeitpunkt, was abgerufen wurde, und die Art deines Geräts oder Browsers. Wir nutzen sie nur, um die App sicher zu halten und Fehler zu finden. Sie werden nach spätestens 7 Tagen automatisch gelöscht.']
    },
    {
      heading: 'Dein Standort',
      body: ['Wenn du es erlaubst, nutzt die App den Standort deines Handys, um Runden in deiner Nähe zu finden. Er wird mit der Suche übertragen und nicht gespeichert. Du kannst stattdessen jederzeit nach Platz suchen.']
    },
    {
      heading: 'Auf deinem Handy gespeichert',
      body: ['Damit die App funktioniert, speichert sie einiges auf deinem Gerät: deine Anmeldung (damit du angemeldet bleibst), deine Sprachwahl, einen Einladungscode, bis du angemeldet bist, und Ergebnisse, die du ohne Verbindung eingegeben hast, bis sie gespeichert sind. Das ist für die App unbedingt erforderlich, deshalb fragen wir nicht nach einer Einwilligung (§ 25 Abs. 2 TDDDG). Es wird nicht für Tracking genutzt. Wenn du die App deinstallierst, wird es gelöscht.']
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
        'Supabase (Supabase Inc., USA) speichert die Daten, Fotos und Konten der App auf Servern in Frankfurt am Main. Supabase arbeitet für uns auf Grundlage eines Auftragsverarbeitungsvertrags (Art. 28 DSGVO). Da Supabase ein US-Unternehmen ist, könnten Mitarbeitende in seltenen Fällen von außerhalb der EU auf Daten zugreifen; dafür gelten die EU-Standardvertragsklauseln.',
        'Google (Google Ireland Ltd. und Google LLC, USA): Wenn du „Weiter mit Google“ wählst, übernimmt Google die Anmeldung. Anmelde- und Bestätigungs-E-Mails werden derzeit über ein Gmail-Konto verschickt; Google verarbeitet dabei deine E-Mail-Adresse und den Inhalt der E-Mail. Übermittlungen an Google LLC sind durch das EU-US Data Privacy Framework abgedeckt.',
        'Firebase Cloud Messaging (Google) stellt Push-Mitteilungen auf Android-Handys zu. Dabei erhält der Dienst das Token deines Handys und den Text jeder Mitteilung (zum Beispiel „Lena ist deiner Runde beigetreten“). Du kannst Mitteilungen jederzeit in den Einstellungen deines Handys ausschalten.',
        'Namen und Lage der Golfplätze stammen von OpenStreetMap. An OpenStreetMap werden keine personenbezogenen Daten übermittelt.',
        'Wir verkaufen deine Daten nicht und geben sie an niemanden sonst weiter, außer wenn das Gesetz es verlangt.'
      ]
    },
    {
      heading: 'Rechtsgrundlage',
      body: [
        'Wir nutzen deine Daten, um dir die App bereitzustellen, für die du dich angemeldet hast (Art. 6 Abs. 1 lit. b DSGVO).',
        'Freiwillige Angaben wie Geburtsjahr, Geschlecht und Standort nutzen wir, weil du sie uns gegeben hast (Art. 6 Abs. 1 lit. a DSGVO). Wenn du „Frau“ angegeben hast, nutzen wir das auch, damit du Runden nur für Frauen sehen, einstellen und ihnen beitreten kannst. Dein Geschlecht selbst wird nicht angezeigt, aber die Spielerinnen einer Runde nur für Frauen können erkennen, dass alle darin Frauen sind. Du kannst diese Einwilligung jederzeit widerrufen, indem du sie unter „Profil bearbeiten“ entfernst oder den Standortzugriff ausschaltest. Was wir vorher damit getan haben, bleibt davon unberührt.',
        'Technische Daten nutzen wir, weil wir ein berechtigtes Interesse daran haben, die App sicher und funktionsfähig zu halten (Art. 6 Abs. 1 lit. f DSGVO).'
      ]
    },
    {
      heading: 'Wie lange wir Daten speichern',
      body: [
        'So lange du ein Konto hast. Wenn du dein Konto in den Einstellungen löschst, werden Profil, Foto, eigene Scorekarten, Freundschaften und Mitteilungen sofort entfernt. Anstehende Runden, die du organisierst, gehen an einen anderen Spieler, und deine Ergebnisse bleiben auf den Karten anderer Spieler als „Gelöschter Spieler“ stehen, damit deren Karten stimmen.',
        'Kopien in unseren Sicherungen werden innerhalb von 7 Tagen überschrieben.'
      ]
    },
    {
      heading: 'Automatisierte Entscheidungen',
      body: ['Wir treffen keine Entscheidungen über dich, die allein auf automatisierter Verarbeitung beruhen, und erstellen keine Werbeprofile.']
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
      body: ['PARtners ist für Menschen ab 16 Jahren.']
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
  intro: 'Diese Bedingungen gelten, wenn du PARtners nutzt. Mit dem Erstellen eines Kontos stimmst du ihnen zu.',
  sections: [
    {
      heading: 'Der Dienst',
      body: ['PARtners hilft dir, Golfpartner zu finden, Runden zu organisieren und deine Schläge zu zählen. Die App ist kostenlos. Wir buchen keine Startzeiten und nehmen keine Zahlungen an: Greenfees und Buchungen laufen direkt zwischen dir und dem Golfclub.']
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
      body: ['Wir geben uns Mühe, dass PARtners läuft und deine Daten sicher sind, können aber nicht garantieren, dass die App immer verfügbar und fehlerfrei ist. Ergebnisse und Handicaps in der App sind für deinen eigenen Gebrauch und nicht offiziell.']
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

export const IMPRINT_DE: LegalDoc = {
  title: 'Impressum',
  updated: '9. November 2026',
  intro: '',
  sections: [
    {
      heading: 'Angaben gemäß § 5 DDG',
      body: [OPERATOR, ADDRESS, 'Deutschland']
    },
    {
      heading: 'Kontakt',
      body: [`E-Mail: ${CONTACT}`]
    },
    {
      heading: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
      body: [`${OPERATOR}, ${ADDRESS}`]
    }
  ]
};
