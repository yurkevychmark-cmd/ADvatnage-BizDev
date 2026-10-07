import { createClient } from '@supabase/supabase-js';
import { PostgrestClient } from '@supabase/postgrest-js';
import { localBucket } from './files';

const env = (k: string) => (typeof process !== 'undefined' ? process.env[k] : undefined);

/**
 * На нашому сервері (BIZDEV_REST_URL задано) — власна база через PostgREST у
 * внутрішній мережі Docker: ті самі запити .from(...), що й у Supabase, тож
 * сторінки не змінюються. Файли — на томі сервера (files.ts).
 * На Vercel змінної немає — клієнт Supabase, як і раніше.
 */
function make() {
  const restUrl = env('BIZDEV_REST_URL');
  if (restUrl) {
    const rest = new PostgrestClient(restUrl);
    return {
      from: (table: string) => rest.from(table),
      storage: { from: (bucket: string) => localBucket(bucket) },
    } as unknown as ReturnType<typeof createClient>;
  }
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  // process.env works for non-PUBLIC server-side vars in Astro SSR
  const key = env('SUPABASE_SERVICE_KEY') ?? import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  return createClient(url, key);
}

export const supabase = make();
