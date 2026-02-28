import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fail-safe to prevent Vercel build crashes if env vars are missing during build time
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("Supabase credentials not found. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel.");
}

export const supabase = createClient(
    supabaseUrl || '', 
    supabaseAnonKey || ''
);