// Copy this file to environment.ts (which git ignores) and fill it in from Supabase: Project Settings > API.
// Use the publishable key (sb_publishable_...), never the secret key. Row Level Security protects the data.
export const environment = {
  supabaseUrl: 'https://YOUR-PROJECT-REF.supabase.co',
  supabaseAnonKey: 'sb_publishable_...'
};
