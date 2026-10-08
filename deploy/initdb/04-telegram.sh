#!/bin/sh
# Розмови з Telegram (таск 140108c8, BizDev-агент · 2/8).
#
# bizdev_listener — окремий логін слухача (контейнер bizdev-listener): лише читає й
# дописує свої дві таблиці, решти бази не бачить і нічого не видаляє.
# Текст у tg_messages — уже замаскований слухачем (listener/src/mask.mjs): гаманців,
# кодів, паролів, карток і ключів тут немає. Медіа не зберігаються — лише їхній вид.
#
# Ідемпотентно: той самий скрипт застосовується до живої бази й при першому старті
# порожньої (docker-entrypoint-initdb.d). Пароль — BIZDEV_LISTENER_PASSWORD з env.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
do \$\$ begin
  if not exists (select from pg_roles where rolname = 'bizdev_listener') then
    create role bizdev_listener login;
  end if;
end \$\$;
alter role bizdev_listener login password '${BIZDEV_LISTENER_PASSWORD}';

create table if not exists public.tg_chats (
  chat_id       bigint primary key,           -- id з позначкою типу: -100… канал/супергрупа, -… група, >0 людина
  title         text,
  kind          text not null,                -- user | group | channel
  access_hash   text,                         -- щоб дочитати пропущене після перезапуску
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.tg_messages (
  chat_id         bigint not null references public.tg_chats(chat_id),
  message_id      bigint not null,
  sent_at         timestamptz not null,
  edited_at       timestamptz,
  sender_id       bigint,
  sender_name     text,
  sender_username text,
  is_outgoing     boolean not null default false,  -- написав наш робочий акаунт
  reply_to_id     bigint,
  text            text not null default '',        -- лише після маскування
  masked          text[] not null default '{}',    -- що замасковано: wallet, code, password, card, key
  media           text,                            -- photo | video | voice | document | sticker | other; сам файл не зберігається
  inserted_at     timestamptz not null default now(),
  primary key (chat_id, message_id)
);
create index if not exists tg_messages_chat_time_idx on public.tg_messages (chat_id, sent_at desc);

grant usage on schema public to bizdev_listener;
grant select, insert, update on public.tg_chats, public.tg_messages to bizdev_listener;
SQL
