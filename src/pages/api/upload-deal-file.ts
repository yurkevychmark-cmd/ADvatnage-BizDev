import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const file = form.get('file') as File | null;
  const dealId = form.get('deal_id') as string | null;
  const fileType = form.get('file_type') as string | null; // 'deal_terms' | 'invoice'

  if (!file || !dealId || !fileType) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  if (!['deal_terms', 'invoice'].includes(fileType)) {
    return new Response(JSON.stringify({ error: 'Invalid file_type' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${dealId}/${fileType}.${ext}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from('deals')
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const { data: { publicUrl } } = supabase.storage.from('deals').getPublicUrl(path);

  const column = fileType === 'deal_terms' ? 'deal_terms_url' : 'invoice_url';
  await supabase.from('projects').update({ [column]: publicUrl }).eq('id', dealId);

  return new Response(JSON.stringify({ url: publicUrl }), { headers: { 'Content-Type': 'application/json' } });
};
