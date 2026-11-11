import { ErrorHandler, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics, StackFrame } from '@capacitor-firebase/crashlytics';

/** Per app launch, so a loop of the same error can't flood Crashlytics. */
const MAX_PER_SESSION = 20;

/**
 * Logs every uncaught error to the console as before and, on a phone, also records it in
 * Firebase Crashlytics as a non-fatal issue (native crashes are caught by Crashlytics itself).
 * Each distinct message is sent once per launch. Reporting never throws.
 */
@Injectable()
export class ReportingErrorHandler implements ErrorHandler {
  private router = inject(Router);
  private sent = new Set<string>();
  private readonly native = Capacitor.isNativePlatform();

  handleError(error: unknown): void {
    console.error(error);
    if (!this.native) return; // the dev preview has no Crashlytics
    try {
      const err = unwrap(error);
      const message = (err?.message || String(error) || '').trim();
      if (!message || this.sent.has(message) || this.sent.size >= MAX_PER_SESSION) return;
      if (/^(ResizeObserver loop|Script error\.?$)/.test(message)) return; // browser noise, not ours
      this.sent.add(message);
      FirebaseCrashlytics.recordException({
        message: `${err?.name ?? 'Error'}: ${message}`.slice(0, 1000),
        stacktrace: frames(err?.stack),
        keysAndValues: [{ key: 'route', value: this.router.url.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ':id'), type: 'string' }]
      }).catch(() => { /* Crashlytics unavailable: the console log is enough */ });
    } catch { /* never let reporting break the app */ }
  }
}

/** Angular and promise rejections wrap the real error; dig it out. */
function unwrap(error: any): Error | null {
  let e = error;
  for (let i = 0; i < 3 && e && !(e instanceof Error); i++) e = e.rejection ?? e.error ?? e.reason ?? null;
  return e instanceof Error ? e : null;
}

/** Chrome / Android WebView stack lines ("at fn (file:line:col)") as Crashlytics frames. */
function frames(stack: string | undefined): StackFrame[] | undefined {
  if (!stack) return undefined;
  const out: StackFrame[] = [];
  for (const line of stack.split('\n')) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):\d+\)?$/);
    if (m) out.push({ functionName: m[1] || '<anonymous>', fileName: m[2], lineNumber: Number(m[3]) });
  }
  return out.length ? out.slice(0, 50) : undefined;
}
