import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail-safe check for Production
if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL: Supabase keys are missing! Check your Vercel Environment Variables.");
}

export const supabase = createClient(
    supabaseUrl || '', 
    supabaseAnonKey || ''
);