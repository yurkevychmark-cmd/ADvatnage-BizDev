-- Автоматичне порівняння чернеток агента з відповідями Марка (таск cfb5898d, BizDev-агент · 3/8,
-- правка Марка 26.10: ручної розмітки немає, стандарт — справжні відповіді Марка).
--
-- backtest_pairs   — усі пари «повідомлення партнера → відповідь Марка» з BizDev-чатів (замасковані
--                    ще на Mac, backtest/import-pairs.mjs) + сортування: чи відповідь про це повідомлення.
-- agent_examples   — відповіді Марка як приклади для агента; правляться в порталі без деплою.
-- backtest_runs    — прогін: яка модель писала, яка оцінювала, прогрес.
-- backtest_evals   — оцінка чернетки проти відповіді Марка (окрема модель).
-- Чернетки й ситуації — у наявних backtest_situations / backtest_drafts (run_id = id прогону).
-- Нічого нікуди не надсилається. Ідемпотентно.

create table if not exists public.backtest_pairs (
  id               text primary key,                  -- p_<хеш чат|час|автор>
  chat             text not null,
  chat_title       text,
  ts               text not null,                     -- час першого повідомлення партнера
  partner_author   text,
  partner_role     text,
  partner_message  text not null,
  real_reply       text not null,                     -- відповідь Марка (агент її не бачить)
  reply_ts         text,
  context          jsonb not null default '[]',       -- до 6 попередніх повідомлень
  -- сортування (модель-оцінювач, один раз на пару)
  relevant         boolean,                           -- null = ще не сортовано
  filter_reason    text,                              -- чому відсіяно
  situation_type   text,
  triage_model     text,
  imported_at      timestamptz not null default now()
);
create index if not exists backtest_pairs_ts_idx on public.backtest_pairs (ts);

create table if not exists public.agent_examples (
  id               text primary key,                  -- = id пари
  role             text not null default 'bizdev',
  pair_id          text references public.backtest_pairs (id) on delete set null,
  chat             text,
  ts               text,
  situation_type   text,
  partner_author   text,
  partner_role     text,
  partner_message  text not null,
  reply            text not null,                     -- як відповів Марко (можна правити)
  active           boolean not null default true,     -- вимкнений приклад агент не бере
  edited_by        text,
  edited_at        timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists agent_examples_role_idx on public.agent_examples (role, active);

create table if not exists public.backtest_runs (
  id               text primary key,                  -- bt3-20261026-1412
  drafter_model    text not null,
  judge_model      text not null,
  status           text not null default 'running' check (status in ('running', 'done', 'failed')),
  total            integer not null default 0,
  done             integer not null default 0,
  error            text,
  started_by       text,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  check (drafter_model <> judge_model)               -- оцінює інша модель, ніж та, що писала
);

create table if not exists public.backtest_evals (
  situation_id     text primary key references public.backtest_situations (id) on delete cascade,
  marko_action     text,                              -- answered / clarified / promised / handed_off / ack
  agent_action     text,
  same_action      boolean not null,
  invented_fact    boolean not null,
  invented_what    text,
  tone_ok          boolean not null,
  length_ratio     real,                              -- довжина чернетки / довжина відповіді Марка
  length_ok        boolean not null,
  match            boolean not null,                  -- збіг: та сама дія, нічого не вигадано, тон і довжина в нормі
  reason           text,                              -- чому не збіг (українською)
  judge_model      text not null,
  created_at       timestamptz not null default now(),
  check (not (invented_fact and match))              -- вигаданий факт — завжди «не збіг»
);

alter table public.backtest_situations add column if not exists pair_id text;
alter table public.backtest_situations add column if not exists example_ids jsonb;   -- які приклади бачив агент
alter table public.backtest_situations drop constraint if exists backtest_situations_kind_check;
alter table public.backtest_situations add constraint backtest_situations_kind_check check (kind in ('archive', 'synthetic', 'pair'));

notify pgrst, 'reload schema';
