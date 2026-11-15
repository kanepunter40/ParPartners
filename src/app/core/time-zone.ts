/**
 * Tee times belong to the course: a 09:00 round in Sydney is shown and entered as 09:00 whatever
 * time zone the phone is in. Each course has an IANA time zone (courses.time_zone, migration 0033).
 */

/** The phone's own time zone, e.g. "Europe/Berlin". */
export const deviceTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** How far `zone` is ahead of UTC at `ms`, in milliseconds. */
function offsetMs(ms: number, zone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).formatToParts(new Date(ms)).map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts['year'], +parts['month'] - 1, +parts['day'], +parts['hour'], +parts['minute'], +parts['second']);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** "2026-11-21T09:00" read as a clock time in `zone` -> the moment, as an ISO string in UTC. */
export function wallTimeToIso(wall: string, zone: string): string {
  const [date, time = '00:00'] = wall.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Twice, so a guess on the far side of a daylight-saving change still lands right
  let ms = guess - offsetMs(guess, zone);
  ms = guess - offsetMs(ms, zone);
  return new Date(ms).toISOString();
}

/** True when the course's clock shows a different time from the phone's at that moment. */
export function differsFromDevice(at: string | Date, zone: string | null | undefined): boolean {
  if (!zone) return false;
  const ms = new Date(at).getTime();
  return offsetMs(ms, zone) !== offsetMs(ms, deviceTimeZone());
}
