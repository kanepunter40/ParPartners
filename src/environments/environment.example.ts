// Copy this file to environment.ts (which git ignores) and fill it in from Supabase: Project Settings > API.
// Use the publishable key (sb_publishable_...), never the secret key. Row Level Security protects the data.
export const environment = {
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'sb_publishable_...',
  // Google Cloud > Credentials > OAuth client ID of type "Web application" (also used by the Android app).
  // Until it's filled in, the Google button says Google sign-in isn't set up yet.
  googleWebClientId: '',
  // Turn on once android/app/google-services.json is in place (Firebase). Without it, registering for push crashes the Android app.
  pushEnabled: false
};
