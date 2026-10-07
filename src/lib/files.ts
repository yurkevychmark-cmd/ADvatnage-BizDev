import fs from 'node:fs';
import path from 'node:path';

/**
 * Файли угод (deal terms, invoice) на нашому сервері — замість Supabase Storage.
 * Лежать на томі контейнера в BIZDEV_FILES_DIR, віддаються маршрутом /files/…
 * Повторює ту частину API storage-js, яку використовує портал: upload і getPublicUrl.
 */
const ROOT = (typeof process !== 'undefined' && process.env['BIZDEV_FILES_DIR']) || '/data/files';

/** Повний шлях усередині ROOT або null, якщо шлях намагається вийти за його межі. */
export function filePath(bucket: string, rel: string): string | null {
  const full = path.resolve(ROOT, bucket, rel);
  return full.startsWith(path.resolve(ROOT) + path.sep) ? full : null;
}

export function localBucket(bucket: string) {
  return {
    async upload(rel: string, bytes: ArrayBuffer, _opts?: { contentType?: string; upsert?: boolean }) {
      const full = filePath(bucket, rel);
      if (!full) return { data: null, error: { message: 'Invalid path' } };
      try {
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, Buffer.from(bytes));
        return { data: { path: rel }, error: null };
      } catch (e) {
        return { data: null, error: { message: (e as Error).message } };
      }
    },
    getPublicUrl(rel: string) {
      return { data: { publicUrl: `/files/${bucket}/${rel.split('/').map(encodeURIComponent).join('/')}` } };
    },
  };
}
