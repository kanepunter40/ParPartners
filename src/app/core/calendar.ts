import { Capacitor, registerPlugin } from '@capacitor/core';

export interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  location: string;
  description: string;
}

/** Native side: android/app/src/main/java/app/parpartners/CalendarPlugin.java */
const Calendar = registerPlugin<{ addEvent(e: { title: string; begin: number; end: number; location: string; description: string }): Promise<{ opened: boolean }> }>('Calendar');

/** A round takes about four and a half hours (18 holes plus getting there a little early). */
export const ROUND_MINUTES = 270;

/**
 * Opens the phone's calendar with the event filled in (Android). Elsewhere (the browser preview, and iOS
 * until it has its own plugin) it downloads an .ics file, which any calendar app can open.
 */
export async function addToCalendar(e: CalendarEvent) {
  if (Capacitor.getPlatform() === 'android') {
    await Calendar.addEvent({ title: e.title, begin: e.start.getTime(), end: e.end.getTime(), location: e.location, description: e.description });
    return;
  }
  const blob = new Blob([ics(e)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'round.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ics(e: CalendarEvent): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => '\\' + c);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PARtners//Round//EN', 'BEGIN:VEVENT',
    `UID:${stamp(e.start)}-${Math.random().toString(36).slice(2)}@parpartners.app`,
    `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end)}`,
    `SUMMARY:${text(e.title)}`, `LOCATION:${text(e.location)}`, `DESCRIPTION:${text(e.description)}`,
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
}
