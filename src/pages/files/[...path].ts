import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { filePath } from '../../lib/files';

const TYPES: Record<string, string> = {
  '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/** Файли угод з тому сервера: /files/<bucket>/<шлях>. */
export const GET: APIRoute = async ({ params }) => {
  const parts = (params.path ?? '').split('/');
  const bucket = parts.shift();
  if (!bucket || parts.length === 0) return new Response('Not found', { status: 404 });
  const full = filePath(bucket, parts.map(decodeURIComponent).join('/'));
  if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) return new Response('Not found', { status: 404 });
  const type = TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream';
  return new Response(fs.readFileSync(full), {
    headers: { 'Content-Type': type, 'Content-Disposition': `inline; filename="${path.basename(full).replace(/"/g, '')}"` },
  });
};
