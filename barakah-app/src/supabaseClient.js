import { createClient } from '@supabase/supabase-js';

// Replace these with the keys you just copied from Step 2
const supabaseUrl = 'https://ozdytjomsqwiprldsevv.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96ZHl0am9tc3F3aXBybGRzZXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDQ0NjYsImV4cCI6MjA4NzYyMDQ2Nn0.j8PGGE_MoHSX7Wd7Zjb4TY24ummDzE54iZwCKt-P4yM'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);