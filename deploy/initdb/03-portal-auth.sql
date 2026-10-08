-- Вхід у портал (таск e5ca9438, BizDev-агент · 1/8).
--
-- Паролі, сесії й запрошення лежать у схемі portal_auth. PostgREST віддає лише public
-- (PGRST_DB_SCHEMAS), тож ці таблиці недоступні навіть порталу напряму. Портал ходить
-- сюди тільки через п'ять функцій у public, які виконуються з правами власника бази:
-- пароль і хеш ніколи не повертаються назовні.
--
-- Токени сесій і запрошень випадкові (32 байти), у базі зберігається лише їхній sha256 —
-- дамп бази не дає живих сесій. Секрету сесії в env немає: він не потрібен.
--
-- Скрипт ідемпотентний: той самий файл застосовується до живої бази і при першому
-- старті порожньої (docker-entrypoint-initdb.d).

create extension if not exists pgcrypto;

create schema if not exists portal_auth;
revoke all on schema portal_auth from public;

create table if not exists portal_auth.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(btrim(email))),
  name          text,
  password_hash text,
  created_at    timestamptz not null default now(),
  disabled_at   timestamptz
);

create table if not exists portal_auth.sessions (
  token_hash   bytea primary key,
  user_id      uuid not null references portal_auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now(),
  user_agent   text
);
create index if not exists sessions_user_idx on portal_auth.sessions(user_id);

create table if not exists portal_auth.invites (
  token_hash bytea primary key,
  email      text not null,
  name       text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);

create table if not exists portal_auth.login_attempts (
  id         bigserial primary key,
  email      text not null,
  ok         boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_email_idx on portal_auth.login_attempts(email, created_at);

-- ── Внутрішні допоміжні функції (не в public, PostgREST їх не бачить) ──────────────

create or replace function portal_auth.hash_token(p_token text) returns bytea
language sql immutable as $$ select sha256(convert_to(p_token, 'UTF8')) $$;

create or replace function portal_auth.new_session(p_user uuid, p_user_agent text) returns text
language plpgsql security definer set search_path = portal_auth, public, pg_temp as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  insert into portal_auth.sessions(token_hash, user_id, expires_at, user_agent)
  values (portal_auth.hash_token(v_token), p_user, now() + interval '30 days', left(p_user_agent, 300));
  -- Прибирання прострочених сесій і старих спроб входу — дешево й без окремого крону.
  delete from portal_auth.sessions where expires_at < now();
  delete from portal_auth.login_attempts where created_at < now() - interval '30 days';
  return v_token;
end $$;

-- Запрошення створює лише власник бази (deploy/auth/invite.sh через docker exec).
-- Порталу ця функція не видана: з браузера запрошення не створити.
create or replace function portal_auth.create_invite(p_email text, p_name text default null, p_hours int default 24)
returns text
language plpgsql security definer set search_path = portal_auth, public, pg_temp as $$
declare
  v_token text := encode(gen_random_bytes(32), 'hex');
begin
  if position('@' in coalesce(p_email, '')) = 0 then
    raise exception 'invalid email';
  end if;
  insert into portal_auth.invites(token_hash, email, name, expires_at)
  values (portal_auth.hash_token(v_token), lower(btrim(p_email)), nullif(btrim(p_name), ''),
          now() + make_interval(hours => p_hours));
  return v_token;
end $$;

revoke all on all functions in schema portal_auth from public;

-- ── Функції для порталу (public → їх бачить PostgREST під роллю bizdev_api) ────────

-- Вхід: токен сесії або null. Після 10 невдалих спроб за 15 хвилин для цієї адреси —
-- null навіть із правильним паролем, доки вікно не мине. Помилка однакова, щоб не
-- підказувати, чи існує адреса.
create or replace function public.portal_login(p_email text, p_password text, p_user_agent text default null)
returns text
language plpgsql security definer set search_path = portal_auth, public, pg_temp as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user  portal_auth.users;
  v_fails int;
begin
  select count(*) into v_fails from portal_auth.login_attempts
   where email = v_email and not ok and created_at > now() - interval '15 minutes';
  select * into v_user from portal_auth.users where email = v_email and disabled_at is null;

  if v_fails >= 10 or v_user.id is null or v_user.password_hash is null
     or v_user.password_hash <> crypt(coalesce(p_password, ''), v_user.password_hash) then
    if v_user.id is null then
      -- Та сама ціна часу, що й для справжньої перевірки: адресу не вгадати за затримкою.
      perform crypt(coalesce(p_password, ''), gen_salt('bf', 10));
    end if;
    insert into portal_auth.login_attempts(email, ok) values (v_email, false);
    return null;
  end if;

  insert into portal_auth.login_attempts(email, ok) values (v_email, true);
  return portal_auth.new_session(v_user.id, p_user_agent);
end $$;

-- Хто за цим токеном. last_seen_at оновлюється не частіше разу на 5 хвилин.
create or replace function public.portal_session(p_token text)
returns table(user_id uuid, email text, name text)
language plpgsql security definer set search_path = portal_auth, public, pg_temp as $$
declare
  v_hash bytea := portal_auth.hash_token(coalesce(p_token, ''));
begin
  update portal_auth.sessions s set last_seen_at = now()
   where s.token_hash = v_hash and s.last_seen_at < now() - interval '5 minutes';
  return query
    select u.id, u.email, u.name
      from portal_auth.sessions s join portal_auth.users u on u.id = s.user_id
     where s.token_hash = v_hash and s.expires_at > now() and u.disabled_at is null;
end $$;

create or replace function public.portal_logout(p_token text) returns void
language sql security definer set search_path = portal_auth, public, pg_temp as $$
  delete from portal_auth.sessions where token_hash = portal_auth.hash_token(coalesce(p_token, ''));
$$;

-- Для сторінки запрошення: на яку адресу воно, якщо ще дійсне.
create or replace function public.portal_invite_info(p_token text)
returns table(email text, name text)
language sql security definer set search_path = portal_auth, public, pg_temp as $$
  select i.email, i.name from portal_auth.invites i
   where i.token_hash = portal_auth.hash_token(coalesce(p_token, ''))
     and i.used_at is null and i.expires_at > now();
$$;

-- Прийняти запрошення: створює користувача або ставить новий пароль наявному (так само
-- відновлюється забутий пароль), закриває всі його попередні сесії і відкриває нову.
create or replace function public.portal_accept_invite(p_token text, p_password text, p_user_agent text default null)
returns text
language plpgsql security definer set search_path = portal_auth, public, pg_temp as $$
declare
  v_inv  portal_auth.invites;
  v_user uuid;
begin
  if length(coalesce(p_password, '')) < 10 then
    raise exception 'password too short';
  end if;
  select * into v_inv from portal_auth.invites
   where token_hash = portal_auth.hash_token(coalesce(p_token, ''))
     and used_at is null and expires_at > now()
   for update;
  if v_inv.token_hash is null then
    return null;
  end if;

  insert into portal_auth.users(email, name, password_hash)
  values (v_inv.email, v_inv.name, crypt(p_password, gen_salt('bf', 10)))
  on conflict (email) do update
     set password_hash = excluded.password_hash,
         name = coalesce(excluded.name, portal_auth.users.name),
         disabled_at = null
  returning id into v_user;

  delete from portal_auth.sessions where user_id = v_user;
  update portal_auth.invites set used_at = now() where token_hash = v_inv.token_hash;
  return portal_auth.new_session(v_user, p_user_agent);
end $$;

revoke all on function public.portal_login(text, text, text)          from public;
revoke all on function public.portal_session(text)                    from public;
revoke all on function public.portal_logout(text)                     from public;
revoke all on function public.portal_invite_info(text)                from public;
revoke all on function public.portal_accept_invite(text, text, text)  from public;
grant execute on function public.portal_login(text, text, text)          to bizdev_api;
grant execute on function public.portal_session(text)                    to bizdev_api;
grant execute on function public.portal_logout(text)                     to bizdev_api;
grant execute on function public.portal_invite_info(text)                to bizdev_api;
grant execute on function public.portal_accept_invite(text, text, text)  to bizdev_api;

notify pgrst, 'reload schema';
