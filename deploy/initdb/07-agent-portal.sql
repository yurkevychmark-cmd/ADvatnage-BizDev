-- Портал під агента (таск 1dcedada, BizDev-агент · 4/8).
--
-- tg_chat_links    — Telegram-чат прив'язано до картки баєра чи оператора. Слухач читає лише чати
--                    з цієї таблиці (і, поки його не очистять, зі старого списку в env).
-- projects         — угода: наступний дотик і пауза агента. «Дотиків без відповіді» не зберігається,
--                    а рахується з tg_messages (deal_agent_state).
-- agent_drafts     — чернетки агента по угоді (пише агент з 5/8; звідси їх ніхто не надсилає).
-- agent_notes      — нотатки агента по угоді.
-- tasks            — таски агента: source = 'agent', обов'язкові привід і дедлайн.
-- Головний таск-менеджер (advantage_kb) тут не з'являється ніде. Ідемпотентно.

create table if not exists public.tg_chat_links (
  id           uuid primary key default gen_random_uuid(),
  chat_id      bigint not null,
  chat_title   text,                                -- назва на момент прив'язки (зі списку діалогів слухача)
  chat_kind    text,                                -- user | group | channel
  buyer_id     uuid references public.buyers (id) on delete cascade,
  operator_id  uuid references public.operators (id) on delete cascade,
  linked_by    text,
  linked_at    timestamptz not null default now(),
  check ((buyer_id is null) <> (operator_id is null))  -- рівно одна картка
);
create unique index if not exists tg_chat_links_uniq on public.tg_chat_links (chat_id, coalesce(buyer_id, operator_id));
create index if not exists tg_chat_links_buyer_idx on public.tg_chat_links (buyer_id);
create index if not exists tg_chat_links_operator_idx on public.tg_chat_links (operator_id);

-- Слухач бачить лише id прив'язаних чатів — не картки й не те, хто прив'язав.
grant select (chat_id) on public.tg_chat_links to bizdev_listener;

alter table public.projects add column if not exists next_touch_at   timestamptz;
alter table public.projects add column if not exists agent_paused    boolean not null default false;
alter table public.projects add column if not exists agent_paused_at timestamptz;
alter table public.projects add column if not exists agent_paused_by text;

create table if not exists public.agent_drafts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  chat_id     bigint,
  body        text not null,
  why         text,                                 -- чому агент так пише
  status      text not null default 'draft' check (status in ('draft', 'approved', 'discarded', 'sent')),
  created_at  timestamptz not null default now()
);
create index if not exists agent_drafts_project_idx on public.agent_drafts (project_id, created_at);

create table if not exists public.agent_notes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists agent_notes_project_idx on public.agent_notes (project_id, created_at);

alter table public.tasks add column if not exists reason text;
alter table public.tasks add column if not exists source text not null default 'manual';
alter table public.tasks drop constraint if exists tasks_source_check;
alter table public.tasks add constraint tasks_source_check check (source in ('manual', 'agent'));
alter table public.tasks drop constraint if exists tasks_agent_fields_check;
alter table public.tasks add constraint tasks_agent_fields_check
  check (source <> 'agent' or (reason is not null and btrim(reason) <> '' and due_date is not null));

-- Чати угоди: прив'язані до її баєра й до її оператора.
create or replace view public.deal_chats as
  select p.id as project_id, l.chat_id, coalesce(c.title, l.chat_title) as title, 'buyer'::text as side
    from public.projects p join public.tg_chat_links l on l.buyer_id = p.buyer_id
    left join public.tg_chats c on c.chat_id = l.chat_id
  union all
  select p.id, l.chat_id, coalesce(c.title, l.chat_title), 'operator'
    from public.projects p join public.tg_chat_links l on l.operator_id = p.operator_id
    left join public.tg_chats c on c.chat_id = l.chat_id;

-- Наші повідомлення в чаті після останнього повідомлення партнера.
create or replace function public.chat_unanswered(p_chat bigint) returns integer
language sql stable as $$
  select count(*)::int from public.tg_messages m
   where m.chat_id = p_chat and m.is_outgoing
     and m.sent_at > coalesce((select max(sent_at) from public.tg_messages
                                where chat_id = p_chat and not is_outgoing), '-infinity')
$$;

create or replace view public.deal_agent_state as
  select p.id as project_id, p.next_touch_at, p.agent_paused, p.agent_paused_at, p.agent_paused_by,
         coalesce((select sum(public.chat_unanswered(x.chat_id))
                     from (select distinct chat_id from public.deal_chats d where d.project_id = p.id) x), 0)::int
           as unanswered_touches,
         (select count(distinct chat_id) from public.deal_chats d where d.project_id = p.id)::int as linked_chats
    from public.projects p;

-- Єдине правило «чи може агент діяти»: угода на паузі — мовчить; чат мовчить, якщо хоч одна
-- угода, до якої він прив'язаний, на паузі. Агент (5/8) питає лише ці функції.
create or replace function public.agent_may_act(p_project uuid) returns boolean
language sql stable as $$
  select coalesce((select not agent_paused from public.projects where id = p_project), false)
$$;

create or replace function public.agent_may_act_in_chat(p_chat bigint) returns boolean
language sql stable as $$
  select not exists (select 1 from public.deal_chats d join public.projects p on p.id = d.project_id
                      where d.chat_id = p_chat and p.agent_paused)
$$;

notify pgrst, 'reload schema';
