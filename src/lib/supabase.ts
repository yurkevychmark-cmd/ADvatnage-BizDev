import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
// Use service role key (server-side only) to bypass RLS for this internal tool
const key = import.meta.env.SUPABASE_SERVICE_KEY ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);
