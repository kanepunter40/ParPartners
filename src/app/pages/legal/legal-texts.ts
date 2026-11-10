/**
 * Privacy policy, terms of service and imprint. DRAFT: written to match what the app actually
 * does (November 2026), but not checked by a lawyer. Before launch: replace ADDRESS with a real
 * postal address (GDPR Art. 13 and the German "Impressum" need one) and have the texts reviewed.
 */
export interface LegalSection { heading: string; body: string[] }
export interface LegalDoc { title: string; updated: string; intro: string; sections: LegalSection[] }

export const OPERATOR = 'Kane Punter';
export const CONTACT = 'parpartners.app@gmail.com';
/** TODO before launch: a postal address where legal mail reaches you (no PO box). */
export const ADDRESS = '[Street and number, postcode, city]';

export const PRIVACY: LegalDoc = {
  title: 'Privacy policy',
  updated: '9 November 2026',
  intro: 'PARtners helps golfers find people to play with. This page explains what we store about you, who can see it, and what you can do about it. Short version: we only keep what the app needs to work, we never sell your data, and there are no ads or trackers.',
  sections: [
    {
      heading: 'Who is responsible',
      body: [
        `PARtners is run by ${OPERATOR} as a private project. ${OPERATOR} is responsible for your data under the GDPR.`,
        `${OPERATOR}, ${ADDRESS}, Germany. Email: ${CONTACT}`
      ]
    },
    {
      heading: 'What we store',
      body: [
        'Your account: your email address and, if you use one, your password (stored only as a secure hash). If you sign in with Google, we receive your name and email address from Google.',
        'Your profile: name, photo (optional), home course, handicap, languages, when you like to play, round length and how competitive you are. Year of birth and gender are optional.',
        'What you do in the app: rounds you post or join, requests to join, scorecards and scores, friends and friend requests, and the notifications we send you.',
        'Guests: if you add someone to a scorecard who isn’t on PARtners, we store the name you type for them and their scores. Only add people who are happy with that.',
        'Safety: players you block, and reports you send. If someone reports you, we store the report and the reason they gave. We use reports only to keep PARtners safe, and the person reported never sees who reported them.',
        'Push notifications: if you allow them, a token that identifies your phone to the notification service, and your app language.'
      ]
    },
    {
      heading: 'What you have to give us',
      body: ['To have an account you need an email address (or a Google account) and a name. Without them we can’t give you an account. Everything else in your profile is optional.']
    },
    {
      heading: 'Technical data when you use the app',
      body: ['Whenever the app talks to our servers, Supabase records technical details: your IP address, the time, what was requested, and your device or browser type. We use these only to keep the app secure and to find errors. They are deleted automatically after at most 7 days.']
    },
    {
      heading: 'Your location',
      body: ['If you allow it, the app uses your phone’s location to find rounds near you. It is sent with the search and not stored. You can always search by course instead.']
    },
    {
      heading: 'Stored on your phone',
      body: ['The app keeps a few things on your device so it works: your sign-in session (so you stay signed in), your language choice, an invite code until you’ve signed in, and scores you entered without a connection until they are saved. These are needed for the app to work, so we don’t ask for consent (§ 25(2) TDDDG). They are not used for tracking. Uninstalling the app removes them.']
    },
    {
      heading: 'Who can see what',
      body: [
        'Other signed-in players can see your name, photo, handicap, home course, languages and vibe. Your age and gender are only shown if you switch that on in Edit profile.',
        'Rounds you post as "nearby" are visible to signed-in players in Find. Invite-only rounds are visible only to people with the link.',
        'A scorecard is visible to everyone on it. Your friends see your finished scorecards, the rounds you post or join, and new friendships on their Home feed.',
        'Your email address is never shown to other players.'
      ]
    },
    {
      heading: 'Services we use',
      body: [
        'Supabase (Supabase Inc., USA) stores the app’s data, photos and accounts on servers in Frankfurt, Germany. Supabase works for us under a data processing agreement (GDPR Article 28). Because Supabase is a US company, staff there could in rare cases access data from outside the EU; this is covered by the EU Standard Contractual Clauses.',
        'Google (Google Ireland Ltd. and Google LLC, USA): if you choose "Continue with Google", Google handles that sign-in. Sign-in and confirmation emails are currently sent through a Gmail account, so Google processes your email address and the email’s content. Transfers to Google LLC are covered by the EU–US Data Privacy Framework.',
        'Firebase Cloud Messaging (Google) delivers push notifications to Android phones. It receives your phone’s token and the text of each notification (for example "Lena joined your round"). You can turn notifications off at any time in your phone’s settings.',
        'Golf course names and locations come from OpenStreetMap. No personal data is sent to OpenStreetMap.',
        'We don’t sell your data or share it with anyone else, unless the law requires us to.'
      ]
    },
    {
      heading: 'Why we may use it',
      body: [
        'We use your data to provide the app you signed up for (GDPR Article 6(1)(b)).',
        'Optional details, like your year of birth, gender and location, are used because you chose to give them (Article 6(1)(a)). If your gender is Woman, we also use it to let you see, post and join women-only rounds. Your gender itself isn’t shown, but the players in a women-only round can tell that everyone in it is a woman. You can withdraw that consent at any time by removing them in Edit profile or turning off location access. This doesn’t affect anything we did with them before.',
        'Technical data is used because we have a legitimate interest in keeping the app secure and working (Article 6(1)(f)).'
      ]
    },
    {
      heading: 'How long we keep it',
      body: [
        'As long as you have an account. If you delete your account in Settings, your profile, photo, solo scorecards, friendships and notifications are removed straight away. Upcoming rounds you host pass to another player, and your scores stay on other players’ cards as "Deleted player" so their cards still add up.',
        'Copies in our backups are overwritten within 7 days.'
      ]
    },
    {
      heading: 'Automated decisions',
      body: ['We don’t make decisions about you based only on automated processing, and we don’t build profiles of you for advertising.']
    },
    {
      heading: 'Your rights',
      body: [
        `You can ask for a copy of your data, have it corrected or deleted, limit how we use it, object to its use, or take it with you. Email ${CONTACT} and we’ll reply within a month.`,
        'You can also complain to a data protection authority, for example the Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg.'
      ]
    },
    {
      heading: 'Age',
      body: ['PARtners is for people aged 16 and over.']
    },
    {
      heading: 'Changes',
      body: ['If this policy changes in a way that matters, we’ll tell you in the app before it applies.']
    }
  ]
};

export const TERMS: LegalDoc = {
  title: 'Terms of service',
  updated: '9 November 2026',
  intro: 'These terms apply when you use PARtners. By creating an account you agree to them.',
  sections: [
    {
      heading: 'The service',
      body: ['PARtners helps you find golf partners, organise rounds and keep score. It is free. We don’t book tee times or take payments: green fees and bookings are between you and the golf club.']
    },
    {
      heading: 'Your account',
      body: ['You need to be at least 16. Use your real name, keep your sign-in details to yourself, and tell us if you think someone else is using your account.']
    },
    {
      heading: 'Playing with people you meet here',
      body: [
        'Be respectful, turn up when you say you will, and leave a round in the app if you can’t make it, so the spot opens for someone else.',
        'You choose who you play with. We don’t check players’ identities or handicaps, and we aren’t responsible for what happens on or off the course. Follow each club’s rules and etiquette.'
      ]
    },
    {
      heading: 'What isn’t allowed',
      body: ['Harassing, threatening or misleading other players; fake accounts or impersonation; posting rounds that don’t exist; spam or advertising; and trying to break, overload or get around the app’s security. We may suspend or remove accounts that do this.']
    },
    {
      heading: 'What you post',
      body: ['You keep the rights to what you add, like your photo and notes. You allow us to store it and show it to other players as the app needs to work. Only upload photos you have the right to use.']
    },
    {
      heading: 'Availability',
      body: ['We work to keep PARtners running and your data safe, but the app is provided as it is, without a guarantee that it is always available or free of errors. Scores and handicaps in the app are for your own use and are not official.']
    },
    {
      heading: 'Liability',
      body: ['We are fully liable for intent and gross negligence, and for injury to life, body or health. For slight negligence we are only liable for breaches of essential obligations, limited to the damage that was typically foreseeable. Otherwise our liability is excluded.']
    },
    {
      heading: 'Ending',
      body: ['You can delete your account at any time in Settings. We may end the service with reasonable notice.']
    },
    {
      heading: 'Changes and law',
      body: [
        'If these terms change in a way that matters, we’ll tell you in the app before they apply. German law applies.',
        `Questions: ${CONTACT}`
      ]
    }
  ]
};

export const IMPRINT: LegalDoc = {
  title: 'Imprint',
  updated: '9 November 2026',
  intro: '',
  sections: [
    {
      heading: 'Information under § 5 DDG',
      body: [`${OPERATOR}`, ADDRESS, 'Germany']
    },
    {
      heading: 'Contact',
      body: [`Email: ${CONTACT}`]
    },
    {
      heading: 'Responsible for content under § 18(2) MStV',
      body: [`${OPERATOR}, ${ADDRESS}`]
    }
  ]
};
