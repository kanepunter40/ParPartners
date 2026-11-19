// Every word on the home page, in English and German.
// The screens in public/screens/{en,de} are the real app with made-up demo data (seeded demo players, no real people).

export type Lang = 'en' | 'de';
export type Shot = 'home' | 'find' | 'round' | 'chat' | 'scorecard' | 'notifications';
export type Icon = 'find' | 'chat' | 'card' | 'friends' | 'bell' | 'free' | 'clock' | 'weather' | 'host' | 'calendar';

const COURSES = { en: '5,294', de: '5.294' };

export const CONTENT = {
  en: {
    // Search result title and description: the words people search for ("golf partners", "near you")
    title: 'Find golf partners near you | PARtners',
    description: 'PARtners is a free app for finding golf partners: see open tee times near you, ask to join, chat and keep score together on one card.',
    ogAlt: 'PARtners: find golf partners near you. Screens from the app showing open rounds and the home feed.',
    other: 'Deutsch',
    nav: { how: 'How it works', features: 'Features', questions: 'Questions', get: 'Join the waitlist' },
    h1: 'Find people to play golf with.',
    lead: 'See open tee times at courses near you, ask to join, and keep score together on one card.',
    soon: 'Coming soon to',
    meta: `Free · ${COURSES.en} courses in Germany, France, England and Australia`,
    heroAlt: ['Find: open rounds near you', 'Home: your next round and what your friends are playing'],

    how: {
      h: 'How a round comes together',
      p: 'From an open spot to a finished card, everything happens in one place.',
      step: 'Step',
      steps: [
        { shot: 'find', t: 'Find an open spot', p: 'Rounds within your distance, with the tee time, the host and their handicap.' },
        { shot: 'notifications', t: 'Ask to join', p: 'The host accepts your request and you get a notification: you’re in.' },
        { shot: 'chat', t: 'Sort out the details', p: 'Every round has its own chat for lifts, meeting points and tees.' },
        { shot: 'scorecard', t: 'Keep score together', p: 'One card for the group, hole by hole, with totals as you go.' }
      ] as { shot: Shot; t: string; p: string }[]
    },

    round: {
      h: 'Everything about the round on one page',
      p: 'Open a round and you see what you need to decide.',
      alt: 'A round: tee time, course, host, format and the weather at tee time',
      left: [
        ['clock', 'Tee time on the course’s clock', 'Playing abroad? Times show as the course sees them.'],
        ['weather', 'Weather at tee time', 'Chance of rain and wind for the hour you tee off.']
      ] as [Icon, string, string][],
      right: [
        ['host', 'Hosts decide who joins', 'Requests come in with the player’s name and handicap.'],
        ['calendar', 'Add to calendar', 'One tap puts the tee time in your calendar.']
      ] as [Icon, string, string][]
    },

    features: {
      h: 'Everything in the app',
      items: [
        ['find', 'Find', 'Rounds by distance, day and handicap'],
        ['chat', 'Round chat', 'One thread for everyone in the round'],
        ['card', 'Scorecards', 'A shared card, and your stats over time'],
        ['friends', 'Friends', 'Invite them straight to your next round'],
        ['bell', 'Saved searches', 'A notification when a matching round is posted'],
        ['free', 'I’m free to play', 'Say when you’re free and hosts nearby can invite you']
      ] as [Icon, string, string][]
    },

    faq: {
      h: 'Questions',
      items: [
        ['Does it cost anything?', 'No. PARtners is free, with no ads and no trackers.'],
        ['Which courses are in the app?', `${COURSES.en} courses in Germany, France, England and Australia.`],
        ['Who can see my profile?', 'Other players see your name, handicap, home course and the details you add, like your languages. Your age and gender stay hidden.'],
        ['Do I need a handicap?', 'No. You can play without one. Rounds show each player’s handicap, so you can pick one that suits you.'],
        ['When can I download it?', 'PARtners is coming to Google Play soon. Join the waitlist and we’ll email you when it’s there.']
      ] as [string, string][]
    },

    end: { h: 'Your next four‑ball is in the app.', p: 'Coming soon to Google Play. Free, with no ads and no trackers.' },
    links: [['/privacy/', 'Privacy'], ['/terms/', 'Terms'], ['/delete-account/', 'Delete account'], ['/imprint/', 'Imprint']] as [string, string][]
  },

  de: {
    title: 'Golfpartner finden: Mitspieler in deiner Nähe | PARtners',
    description: 'Mit PARtners findest du Golfpartner in deiner Nähe: freie Startzeiten sehen, mitspielen, chatten und gemeinsam zählen. Kostenlos, ohne Werbung.',
    ogAlt: 'PARtners: Golfpartner in deiner Nähe finden. Screens aus der App mit offenen Runden und dem Start-Feed.',
    other: 'English',
    nav: { how: 'So geht’s', features: 'Funktionen', questions: 'Fragen', get: 'Auf die Warteliste' },
    h1: 'Finde Leute zum Golfspielen.',
    lead: 'Sieh freie Startzeiten auf Plätzen in deiner Nähe, frag, ob du mitspielen kannst, und zählt gemeinsam auf einer Karte.',
    soon: 'Bald bei',
    meta: `Kostenlos · ${COURSES.de} Plätze in Deutschland, Frankreich, England und Australien`,
    heroAlt: ['Finden: offene Runden in deiner Nähe', 'Start: deine nächste Runde und was deine Freunde spielen'],

    how: {
      h: 'So kommt eine Runde zustande',
      p: 'Vom freien Platz bis zur fertigen Scorekarte passiert alles an einem Ort.',
      step: 'Schritt',
      steps: [
        { shot: 'find', t: 'Freien Platz finden', p: 'Runden in deinem Umkreis, mit Startzeit, Gastgeber und dessen Handicap.' },
        { shot: 'notifications', t: 'Mitspielen anfragen', p: 'Der Gastgeber nimmt deine Anfrage an und du bekommst eine Mitteilung: Du bist dabei.' },
        { shot: 'chat', t: 'Details klären', p: 'Jede Runde hat ihren eigenen Chat für Mitfahrten, Treffpunkt und Abschläge.' },
        { shot: 'scorecard', t: 'Gemeinsam zählen', p: 'Eine Karte für die Gruppe, Loch für Loch, die Summen rechnen sich mit.' }
      ] as { shot: Shot; t: string; p: string }[]
    },

    round: {
      h: 'Alles zur Runde auf einer Seite',
      p: 'Öffne eine Runde und du siehst, was du zum Entscheiden brauchst.',
      alt: 'Eine Runde: Abschlag, Platz, Gastgeber, Spielform und das Wetter zur Abschlagszeit',
      left: [
        ['clock', 'Abschlag in der Uhrzeit des Platzes', 'Im Ausland? Zeiten stehen so da, wie der Platz sie sieht.'],
        ['weather', 'Wetter zur Abschlagszeit', 'Regenrisiko und Wind für die Stunde, in der du abschlägst.']
      ] as [Icon, string, string][],
      right: [
        ['host', 'Gastgeber entscheiden, wer mitspielt', 'Anfragen kommen mit Name und Handicap.'],
        ['calendar', 'In den Kalender', 'Ein Tippen trägt die Startzeit in deinen Kalender ein.']
      ] as [Icon, string, string][]
    },

    features: {
      h: 'Alles in der App',
      items: [
        ['find', 'Finden', 'Runden nach Entfernung, Tag und Handicap'],
        ['chat', 'Runden-Chat', 'Ein Chat für alle in der Runde'],
        ['card', 'Scorekarten', 'Eine gemeinsame Karte und deine Statistik'],
        ['friends', 'Freunde', 'Lade sie direkt zu deiner nächsten Runde ein'],
        ['bell', 'Gespeicherte Suchen', 'Eine Mitteilung, sobald eine passende Runde eingestellt wird'],
        ['free', 'Ich hätte Zeit', 'Sag, wann du Zeit hast, und Gastgeber in der Nähe können dich einladen']
      ] as [Icon, string, string][]
    },

    faq: {
      h: 'Fragen',
      items: [
        ['Kostet das etwas?', 'Nein. PARtners ist kostenlos, ohne Werbung und ohne Tracker.'],
        ['Welche Plätze gibt es in der App?', `${COURSES.de} Plätze in Deutschland, Frankreich, England und Australien.`],
        ['Wer sieht mein Profil?', 'Andere sehen deinen Namen, dein Handicap, deinen Heimatplatz und die Angaben, die du ergänzt, etwa deine Sprachen. Alter und Geschlecht bleiben verborgen.'],
        ['Brauche ich ein Handicap?', 'Nein, du kannst auch ohne spielen. Bei jeder Runde steht das Handicap der Mitspieler, so findest du eine, die passt.'],
        ['Wann kann ich die App laden?', 'PARtners kommt bald zu Google Play. Trag dich in die Warteliste ein, dann schreiben wir dir, sobald es so weit ist.']
      ] as [string, string][]
    },

    end: { h: 'Dein nächster Vierer wartet in der App.', p: 'Bald bei Google Play. Kostenlos, ohne Werbung und ohne Tracker.' },
    links: [['/privacy/', 'Datenschutz'], ['/terms/', 'Nutzungsbedingungen'], ['/delete-account/', 'Konto löschen'], ['/imprint/', 'Impressum']] as [string, string][]
  }
};
