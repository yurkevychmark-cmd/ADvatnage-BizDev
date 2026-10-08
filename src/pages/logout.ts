import type { APIRoute } from 'astro';
import { SESSION_COOKIE, clearSessionCookie, logout } from '../lib/auth';

/** Вихід: закриває сесію в базі й прибирає cookie. */
const handler: APIRoute = async ({ cookies, redirect }) => {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await logout(token);
    } catch (e) {
      console.error('[auth] logout', e);
    }
  }
  clearSessionCookie(cookies);
  return redirect('/login', 303);
};

export const POST = handler;
export const GET = handler;
