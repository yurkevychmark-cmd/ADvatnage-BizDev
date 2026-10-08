import type { AstroCookies } from 'astro';
import { PostgrestClient } from '@supabase/postgrest-js';

/**
 * Вхід у портал (таск e5ca9438). Паролі й сесії живуть у схемі portal_auth бази
 * bizdev-db; сюди ходимо лише через функції portal_* у PostgREST
 * (deploy/initdb/03-portal-auth.sql). Хеш пароля портал не бачить ніколи.
 */

export const SESSION_COOKIE = 'bizdev_session';
const SESSION_DAYS = 30;

export interface PortalUser {
  user_id: string;
  email: string;
  name: string | null;
}

const restUrl = typeof process !== 'undefined' ? process.env.BIZDEV_REST_URL : undefined;
const rest = restUrl ? new PostgrestClient(restUrl) : null;

function api() {
  // Без нашої бази (стара збірка на Vercel) вхід неможливий — портал закритий повністю.
  if (!rest) throw new Error('BIZDEV_REST_URL is not set: portal auth unavailable');
  return rest;
}

export async function sessionUser(token: string): Promise<PortalUser | null> {
  const { data, error } = await api().rpc('portal_session', { p_token: token });
  if (error) throw new Error(`portal_session: ${error.message}`);
  const rows = (data ?? []) as PortalUser[];
  return rows[0] ?? null;
}

export async function login(email: string, password: string, userAgent: string | null): Promise<string | null> {
  const { data, error } = await api().rpc('portal_login', {
    p_email: email, p_password: password, p_user_agent: userAgent,
  });
  if (error) throw new Error(`portal_login: ${error.message}`);
  return (data as string | null) ?? null;
}

export async function logout(token: string): Promise<void> {
  const { error } = await api().rpc('portal_logout', { p_token: token });
  if (error) throw new Error(`portal_logout: ${error.message}`);
}

export async function inviteInfo(token: string): Promise<{ email: string; name: string | null } | null> {
  const { data, error } = await api().rpc('portal_invite_info', { p_token: token });
  if (error) throw new Error(`portal_invite_info: ${error.message}`);
  const rows = (data ?? []) as { email: string; name: string | null }[];
  return rows[0] ?? null;
}

export async function acceptInvite(token: string, password: string, userAgent: string | null): Promise<string | null> {
  const { data, error } = await api().rpc('portal_accept_invite', {
    p_token: token, p_password: password, p_user_agent: userAgent,
  });
  if (error) throw new Error(`portal_accept_invite: ${error.message}`);
  return (data as string | null) ?? null;
}

export function setSessionCookie(cookies: AstroCookies, token: string) {
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Назовні портал лише на https (Traefik), а всередині контейнера запит іде по http —
    // тому Secure ставимо явно, а не з протоколу запиту.
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Куди повернути після входу: лише шлях на цьому ж сайті. */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}
