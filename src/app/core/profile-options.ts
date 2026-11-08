// Choices shared by onboarding and profile editing.
export type RoundLength = 'nine' | 'eighteen' | 'either';
export type Vibe = 'relaxed' | 'competitive' | 'very_competitive';

export const LANGUAGES = ['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Dutch', 'Polish', 'Turkish', 'Arabic'];
export const GENDERS = ['Woman', 'Man', 'Non-binary', 'Self-describe', 'Prefer not to say'];
export const WHEN: [string, string][] = [['weekday_morning', 'Weekday mornings'], ['weekday_evening', 'Weekday evenings'], ['weekend', 'Weekends'], ['anytime', 'Anytime']];
export const LENGTHS: [RoundLength, string][] = [['nine', '9 holes'], ['eighteen', '18 holes'], ['either', 'Either']];
export const VIBES: [Vibe, string, string][] = [
  ['relaxed', 'Relaxed', 'Here for the walk and the chat'],
  ['competitive', 'A bit competitive', 'Keeping score, still having fun'],
  ['very_competitive', 'Very competitive', 'Every shot counts']
];

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
