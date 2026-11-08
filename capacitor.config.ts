import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.parpartners',   // change before the first store build
  appName: 'Par Partners',
  webDir: 'dist/par-partners/browser',
  plugins: {
    // Only bundle the sign-in providers we use (Facebook would add its SDK and ad-ID permission)
    SocialLogin: {
      providers: { google: true, apple: true, facebook: false, twitter: false }
    }
  }
};

export default config;
