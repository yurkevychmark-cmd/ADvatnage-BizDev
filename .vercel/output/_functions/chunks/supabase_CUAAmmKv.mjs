import { createClient } from '@supabase/supabase-js';

const url = "https://unipibjiywsluluavkgv.supabase.co";
const key = "sb_publishable_4G3-PH7wu6TjK_8SgBBZzA_1nVnIHON";
const supabase = createClient(url, key);

export { supabase };
