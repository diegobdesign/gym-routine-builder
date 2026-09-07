import { createClient } from '@supabase/supabase-js';

// Use placeholder values during build to prevent build errors
// Actual values will be used at runtime
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// The gym app lives in the `gym` schema of the AIwD shared Supabase project (merged 2026-09-07).
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'gym' },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
