import { createClient } from '@supabase/supabase-js';

// Use placeholder values during build to prevent build errors
// Actual values will be used at runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// The gym app lives in the `gym` schema of the AIwD shared Supabase project (merged 2026-09-07).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, { db: { schema: 'gym' } });
