import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.parpartners',   // final: the Play Store ID (matches parpartners.app); can never change after the first upload
  appName: 'PARtners',
  webDir: 'dist/par-partners/browser',
  plugins: {
    // Only bundle the sign-in providers we use (Facebook would add its SDK and ad-ID permission)
    SocialLogin: {
      providers: { google: true, apple: true, facebook: false, twitter: false }
    }
  }
};

export default config;
