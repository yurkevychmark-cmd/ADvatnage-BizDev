import { defineMiddleware } from 'astro:middleware';
import { SESSION_COOKIE, sessionUser } from './lib/auth';

/**
 * Без входу відкриваються лише сторінка входу, вихід і запрошення.
 * Решта — сторінки, /api/* і файли угод (/files/*) — тільки з дійсною сесією:
 * сторінка → редирект на /login, API й будь-який не-GET запит → 401 без даних.
 * Статика (/_astro/*, favicon) віддається Node-сервером до middleware.
 *
 * Не-GET запит з іншого сайту — 403 ще до перевірки сесії: cookie сесії браузер
 * підставляє сам, а вбудований checkOrigin Astro вимкнено (astro.config.mjs, c8a6aac).
 * Звіряємо з заголовком Host, а не з ctx.url: у збірці Astro без
 * security.allowedDomains ставить у ctx.url хост localhost (у dev — справжній).
 */
const OPEN_PATHS = new Set(['/login', '/logout']);
const OPEN_PREFIXES = ['/invite/'];

function isForeignOrigin(request: Request): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.headers.get('host');
  } catch {
    return true; // Origin: null (sandbox-iframe тощо)
  }
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  if (isForeignOrigin(ctx.request)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (OPEN_PATHS.has(path) || OPEN_PREFIXES.some((p) => path.startsWith(p))) return next();

  const token = ctx.cookies.get(SESSION_COOKIE)?.value;
  let user = null;
  if (token) {
    try {
      user = await sessionUser(token);
    } catch (e) {
      // База недоступна — пускати не можна; у лог повністю, користувачу — вхід.
      console.error('[auth]', e);
    }
  }

  if (user) {
    ctx.locals.user = user;
    return next();
  }

  const isPage = ctx.request.method === 'GET' || ctx.request.method === 'HEAD';
  if (path.startsWith('/api/') || !isPage) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return ctx.redirect(`/login?next=${encodeURIComponent(path + ctx.url.search)}`, 302);
});
