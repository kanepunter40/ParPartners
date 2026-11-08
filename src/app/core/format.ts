/** "KP" from "Kane Punter". */
export function initials(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
}
