// Every word on the home page, in English and German.
// The examples (names, clubs, scores) are made up, but each one shows something the app really does.

export type Lang = 'en' | 'de';

export type Round = { day: string; date: string; line: string; detail: string; km: string };
export type Note = { when: string; text: string };

export const CONTENT = {
  en: {
    title: 'PARtners: find people to play golf with',
    description: 'PARtners helps golfers find people to play with: post a round, join one nearby, keep score together.',
    other: 'Deutsch',
    h1: 'Find people to play golf with.',
    lead: 'PARtners shows you rounds with open spots at courses near you. Ask to join one, or post your own tee time and let other golfers find you.',
    soon: 'Coming soon to Google Play.',
    how: 'See how it works',
    photoAlt: 'A fairway in morning light',

    s1: {
      h: 'See who’s playing near you',
      p: 'Open the app and you see the rounds coming up around you: the course, the tee time, who’s hosting and how many spots are left. Narrow it down by distance, day and handicap.',
      list: 'Rounds near you this weekend',
      rounds: [
        { day: 'Sat', date: '22', line: 'Lena is playing Lindenhof at 09:10', detail: '2 spots open · handicap 10–25', km: '8 km' },
        { day: 'Sat', date: '22', line: 'Tom is playing Riverside at 13:40', detail: '1 spot open · any handicap', km: '14 km' },
        { day: 'Sun', date: '23', line: 'Priya is playing Hollow Oak at 08:30', detail: '3 spots open · handicap up to 36', km: '21 km' }
      ] as Round[]
    },

    s2: {
      h: 'Join with one tap',
      p: 'Tap a round to ask the host if you can join. They see your name and handicap, and say yes or no. Once you’re in, the round has its own chat.',
      list: 'Your notifications',
      notes: [
        { when: 'Tue', text: 'You asked to join Lena’s round on Sat 22 Nov at 09:10' },
        { when: 'Tue', text: 'You’re in. Lena accepted your request' },
        { when: 'Wed', text: 'Lena: Shall we meet at the pro shop at 08:45?' },
        { when: 'Fri', text: 'Reminder: you tee off tomorrow at 09:10' }
      ] as Note[]
    },

    s3: {
      h: 'Keep score on one card',
      p: 'On the day, the whole group shares one scorecard. Enter strokes hole by hole and the totals add up as you go. Afterwards the card stays with the round.',
      list: 'Lindenhof · front nine',
      hole: 'Hole', par: 'Par', out: 'Out',
      players: [
        { name: 'You', scores: [5, 4, 3, 6, 4, 5, 3, 5, 4] },
        { name: 'Lena', scores: [4, 4, 4, 5, 5, 4, 3, 4, 5] },
        { name: 'Tom', scores: [5, 5, 3, 5, 4, 6, 4, 5, 4] }
      ]
    },

    more: {
      h: 'Also in the app',
      items: [
        ['Friends', 'Add the people you play with and invite them straight to your next round.'],
        ['Saved searches', 'Tell PARtners what you’re looking for and get a notification when a round like that is posted.'],
        ['Free to play', 'Say which days you’re free, and hosts nearby with room in their round can invite you.'],
        ['Courses in four countries', 'Germany, France, England and Australia, with tee times shown on the course’s own clock.']
      ] as [string, string][]
    },

    end: 'Your next four‑ball is in the app.',
    endP: 'PARtners is free. It’s coming to Google Play soon.',
    links: [['/privacy/', 'Privacy'], ['/terms/', 'Terms'], ['/delete-account/', 'Delete account'], ['/imprint/', 'Imprint']] as [string, string][]
  },

  de: {
    title: 'PARtners: Finde Leute zum Golfspielen',
    description: 'Mit PARtners findest du Leute zum Golfspielen: Runde einstellen, einer in der Nähe beitreten, gemeinsam Schläge zählen.',
    other: 'English',
    h1: 'Finde Leute zum Golfspielen.',
    lead: 'PARtners zeigt dir Runden mit freien Plätzen auf Plätzen in deiner Nähe. Frag, ob du mitspielen kannst, oder stell deine eigene Startzeit ein und lass dich finden.',
    soon: 'Bald bei Google Play.',
    how: 'So funktioniert’s',
    photoAlt: 'Ein Fairway im Morgenlicht',

    s1: {
      h: 'Sieh, wer in deiner Nähe spielt',
      p: 'Öffne die App und du siehst die nächsten Runden um dich herum: den Platz, die Startzeit, wer einlädt und wie viele Plätze noch frei sind. Filtere nach Entfernung, Tag und Handicap.',
      list: 'Runden in deiner Nähe am Wochenende',
      rounds: [
        { day: 'Sa', date: '22', line: 'Lena spielt um 09:10 in Lindenhof', detail: '2 Plätze frei · Handicap 10–25', km: '8 km' },
        { day: 'Sa', date: '22', line: 'Tom spielt um 13:40 in Riverside', detail: '1 Platz frei · jedes Handicap', km: '14 km' },
        { day: 'So', date: '23', line: 'Priya spielt um 08:30 in Hollow Oak', detail: '3 Plätze frei · Handicap bis 36', km: '21 km' }
      ] as Round[]
    },

    s2: {
      h: 'Mit einem Tippen dabei',
      p: 'Tippe auf eine Runde und frag den Gastgeber, ob du mitspielen kannst. Der Gastgeber sieht deinen Namen und dein Handicap und sagt zu oder ab. Sobald du dabei bist, hat die Runde ihren eigenen Chat.',
      list: 'Deine Mitteilungen',
      notes: [
        { when: 'Di', text: 'Du hast gefragt, ob du bei Lenas Runde am Sa., 22. Nov. um 09:10 Uhr mitspielen kannst' },
        { when: 'Di', text: 'Du bist dabei. Lena hat deine Anfrage angenommen' },
        { when: 'Mi', text: 'Lena: Treffen wir uns um 08:45 am Pro-Shop?' },
        { when: 'Fr', text: 'Erinnerung: Abschlag morgen um 09:10 Uhr' }
      ] as Note[]
    },

    s3: {
      h: 'Alle auf einer Scorekarte',
      p: 'Auf der Runde teilt sich die ganze Gruppe eine Scorekarte. Trag die Schläge Loch für Loch ein, die Summen rechnen sich mit. Danach bleibt die Karte bei der Runde.',
      list: 'Lindenhof · Loch 1–9',
      hole: 'Loch', par: 'Par', out: 'Out',
      players: [
        { name: 'Du', scores: [5, 4, 3, 6, 4, 5, 3, 5, 4] },
        { name: 'Lena', scores: [4, 4, 4, 5, 5, 4, 3, 4, 5] },
        { name: 'Tom', scores: [5, 5, 3, 5, 4, 6, 4, 5, 4] }
      ]
    },

    more: {
      h: 'Außerdem in der App',
      items: [
        ['Freunde', 'Füg die Leute hinzu, mit denen du spielst, und lade sie direkt zu deiner nächsten Runde ein.'],
        ['Gespeicherte Suchen', 'Sag PARtners, was du suchst, und bekomm eine Mitteilung, sobald so eine Runde eingestellt wird.'],
        ['Zeit zum Spielen', 'Sag, an welchen Tagen du Zeit hast, und Gastgeber in der Nähe mit freien Plätzen können dich einladen.'],
        ['Plätze in vier Ländern', 'Deutschland, Frankreich, England und Australien, mit Startzeiten in der Uhrzeit des Platzes.']
      ] as [string, string][]
    },

    end: 'Dein nächster Vierer wartet in der App.',
    endP: 'PARtners ist kostenlos. Bald bei Google Play.',
    links: [['/privacy/', 'Datenschutz'], ['/terms/', 'Nutzungsbedingungen'], ['/delete-account/', 'Konto löschen'], ['/imprint/', 'Impressum']] as [string, string][]
  }
};

export const PARS = [4, 4, 3, 5, 4, 4, 3, 5, 4];
