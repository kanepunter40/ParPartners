import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import en from '../i18n/en.json';
import de from '../i18n/de.json';

export type Lang = 'en' | 'de';
type Dict = { [key: string]: string | Dict };
type Params = Record<string, string | number | null | undefined>;

const DICTS: Record<Lang, Dict> = { en, de };
const LOCALES: Record<Lang, string> = { en: 'en-GB', de: 'de-DE' };
const STORE = 'pp.lang';

/** Messages the database raises (supabase/migrations), mapped to keys under "server". */
const SERVER_ERRORS: [RegExp, string][] = [
  [/at most 8 players/i, 'server.cardFull'],
  [/finish your profile/i, 'server.profileFirst'],
  [/hole \d+ is not on this card/i, 'server.badHole'],
  [/hosts cancel the round/i, 'server.hostCancels'],
  [/hosts delete the round/i, 'server.hostDeletes'],
  [/invite not found/i, 'server.inviteNotFound'],
  [/not signed in|jwt expired/i, 'server.signedOut'],
  [/only players in this round/i, 'server.playersOnly'],
  [/only the host/i, 'server.hostOnly'],
  [/player not found/i, 'server.playerNotFound'],
  [/request not found/i, 'server.requestNotFound'],
  [/round is full/i, 'server.roundFull'],
  [/invite only/i, 'server.inviteOnly'],
  [/round not available/i, 'server.roundGone'],
  [/scorecard not found/i, 'server.cardNotFound'],
  [/start a scorecard on this course/i, 'server.cardFirst'],
  [/already started/i, 'server.started'],
  [/(add|block|report|invite) yourself/i, 'server.self'],
  [/too many reports/i, 'server.tooManyReports'],
  [/up to 10 alerts/i, 'server.alertLimit'],
  [/next 30 days/i, 'server.freeDay'],
  [/up to 10 days/i, 'server.freeLimit'],
  [/too many invites/i, 'server.tooManyInvites'],
  [/slow down/i, 'server.slowDown'],
  [/tee time in the future/i, 'server.teeFuture'],
  [/within the next year/i, 'server.teeYear'],
  [/too many rounds today/i, 'server.tooManyRounds'],
  [/comes from the course data/i, 'server.parLocked'],
  [/failed to fetch|network ?error|load failed/i, 'server.offline'],
];

/** Named date formats used across the app. */
export type DateStyle = 'dayTime' | 'longDayTime' | 'dayDateYear' | 'time';

/**
 * English/German text for the whole app.
 * Templates and code call t('section.key', { name: 'Lena' }); text lives in src/app/i18n/en.json and de.json.
 * Plurals: if 'x_one' / 'x_other' exist, t('x', { count }) picks the right one.
 * Reading lang() inside t() means signals, computeds and templates update when the language changes.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private sb = inject(SupabaseService);

  /** The player's pick in Settings. Before they pick, the phone's language decides (German phone: German). */
  readonly lang = signal<Lang>(this.stored());
  readonly locale = computed(() => LOCALES[this.lang()]);

  constructor() {
    effect(() => {
      document.documentElement.lang = this.lang();
    });
    // Keep the account's language in step, so the sign-in emails can use it later
    effect(() => {
      const lang = this.lang();
      const user = this.sb.session()?.user;
      if (user && user.user_metadata?.['lang'] !== lang) this.sb.client.auth.updateUser({ data: { lang } });
    });
  }

  setLang(l: Lang) {
    this.lang.set(l);
    try { localStorage.setItem(STORE, l); } catch { /* private mode: just not remembered */ }
  }

  /** Translates a key, e.g. t('settings.title') or t('home.friends', { count: 3 }). Falls back to English, then the key. */
  t = (key: string, params?: Params): string => {
    const lang = this.lang();
    let k = key;
    if (params && typeof params['count'] === 'number') {
      const form = new Intl.PluralRules(LOCALES[lang]).select(params['count']) === 'one' ? 'one' : 'other';
      if (this.lookup(lang, `${key}_${form}`) ?? this.lookup('en', `${key}_${form}`)) k = `${key}_${form}`;
    }
    const text = this.lookup(lang, k) ?? this.lookup('en', k) ?? key;
    // Numbers in the player's style: "31,7" in German, "31.7" in English
    return params
      ? text.replace(/\{(\w+)\}/g, (m, name) => {
          const v = params[name];
          return v == null ? m : typeof v === 'number' ? this.num(v) : v.toString();
        })
      : text;
  };

  /** A number in the player's style: 93,1 in German, 93.1 in English. No thousands separator. */
  num = (n: number, maxDecimals = 3): string =>
    new Intl.NumberFormat(this.locale(), { maximumFractionDigits: maxDecimals, useGrouping: false }).format(n);

  date = (value: string | Date | null | undefined, style: DateStyle = 'dayTime'): string => {
    if (!value) return '';
    const d = new Date(value);
    const loc = this.locale();
    const time = new Intl.DateTimeFormat(loc, { hour: '2-digit', minute: '2-digit' }).format(d);
    switch (style) {
      case 'time': return time;
      case 'dayDateYear': return new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d);
      case 'longDayTime': return `${new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(d)} · ${time}`;
      default: return `${new Intl.DateTimeFormat(loc, { weekday: 'short', day: 'numeric', month: 'short' }).format(d)} · ${time}`;
    }
  };

  /** "Just now", "5 min ago", "Yesterday", or the German equivalents. */
  ago = (iso: string): string => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return this.t('time.justNow');
    const rtf = new Intl.RelativeTimeFormat(this.locale(), { numeric: 'auto', style: 'short' });
    if (mins < 60) return rtf.format(-mins, 'minute');
    const hours = Math.round(mins / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-Math.round(hours / 24), 'day');
  };

  /**
   * A message to show for a failed call. Our own keys ('photo.…', 'auth.…') and the database's known
   * messages are translated; anything else (network, Postgres internals) shows the page's fallback.
   */
  error = (e: unknown, fallbackKey = 'common.error'): string => {
    const m = ((e as Error)?.message ?? '').trim();
    if (/^[a-z]+\.[\w.]+$/.test(m) && this.lookup('en', m)) return this.t(m);
    const known = SERVER_ERRORS.find(([pattern]) => pattern.test(m));
    if (known) return this.t(known[1]);
    if (m) console.warn('[i18n] untranslated error:', m);
    return this.t(fallbackKey);
  };

  private lookup(lang: Lang, key: string): string | undefined {
    let node: string | Dict | undefined = DICTS[lang];
    for (const part of key.split('.')) {
      if (!node || typeof node === 'string') return undefined;
      node = node[part];
    }
    return typeof node === 'string' ? node : undefined;
  }

  private stored(): Lang {
    try {
      const v = localStorage.getItem(STORE);
      if (v === 'en' || v === 'de') return v;
    } catch { /* ignore */ }
    return (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
  }
}
