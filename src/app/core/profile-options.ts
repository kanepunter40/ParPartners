// Choices shared by onboarding and profile editing.
export type RoundLength = 'nine' | 'eighteen' | 'either';
export type Vibe = 'relaxed' | 'competitive' | 'very_competitive';

// Stored values stay in English; labels are i18n keys (see src/app/i18n), e.g. t('options.lang.German').
export const LANGUAGES = ['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Dutch', 'Polish', 'Turkish', 'Arabic'];
export const GENDERS = ['Woman', 'Man', 'Non-binary', 'Self-describe', 'Prefer not to say'];
export const WHEN: [string, string][] = [['weekday_morning', 'options.when.weekday_morning'], ['weekday_evening', 'options.when.weekday_evening'], ['weekend', 'options.when.weekend'], ['anytime', 'options.when.anytime']];
export const LENGTHS: [RoundLength, string][] = [['nine', 'options.length.nine'], ['eighteen', 'options.length.eighteen'], ['either', 'options.length.either']];
export const VIBES: [Vibe, string, string][] = [
  ['relaxed', 'options.vibe.relaxed', 'options.vibeHint.relaxed'],
  ['competitive', 'options.vibe.competitive', 'options.vibeHint.competitive'],
  ['very_competitive', 'options.vibe.very_competitive', 'options.vibeHint.very_competitive']
];

/** i18n key for a stored language name. */
export const langKey = (l: string) => `options.lang.${l}`;
/** i18n key for a stored gender (unknown values are shown as typed). */
export const genderKey = (g: string) => (GENDERS.includes(g) ? `options.gender.${g}` : g);

/** "Anytime" is exclusive: it clears the specific times, and picking a time clears it. */
export function toggleWhen(list: string[], key: string): string[] {
  if (key === 'anytime') return list.includes('anytime') ? [] : ['anytime'];
  const rest = list.filter((x) => x !== 'anytime');
  return rest.includes(key) ? rest.filter((x) => x !== key) : [...rest, key];
}

/** Accepts "18,4" as well as "18.4". */
export function parseHandicap(text: string): number | null {
  const n = parseFloat(text.replace(',', '.'));
  return Number.isFinite(n) && n >= -10 && n <= 54 ? n : null;
}
