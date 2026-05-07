import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
// process.env works for non-PUBLIC server-side vars in Astro SSR
const key = (typeof process !== 'undefined' && process.env['SUPABASE_SERVICE_KEY'])
  ? process.env['SUPABASE_SERVICE_KEY']
  : import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url, key);
