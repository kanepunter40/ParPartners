import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface AppInfo {
  /** "1.0 (1)" on a phone, "web" in the dev preview. */
  version: string;
  platform: string;
  /** Android version and phone model, read from the WebView's user agent. */
  device: string;
}

let cached: Promise<AppInfo> | null = null;

/** What build is running and on what phone: sent with error reports and feedback emails. */
export function appInfo(): Promise<AppInfo> {
  cached ??= (async () => {
    const platform = Capacitor.getPlatform();
    let version = 'web';
    if (Capacitor.isNativePlatform()) {
      try {
        const info = await App.getInfo();
        version = `${info.version} (${info.build})`;
      } catch { /* keep "web" */ }
    }
    const ua = navigator.userAgent;
    const device = ua.match(/\(([^)]*Android[^)]*)\)/)?.[1] ?? ua.match(/\(([^)]*)\)/)?.[1] ?? ua;
    return { version, platform, device: device.slice(0, 200) };
  })();
  return cached;
}
