-- Бектест BizDev-агента на архіві (таск cfb5898d, BizDev-агент · 3/8).
--
-- Ситуація — повідомлення партнера + контекст (архівні ситуації вже замасковані:
-- backtest/lib/mask-archive.mjs). Агент пише чернетку, не бачачи справжньої відповіді;
-- Марко розмічає: «так би і я» / «не те» / своя редакція. Рішення — це приклади для агента.
-- Нічого нікуди не надсилається: ці таблиці — єдине, що пише бектест.
--
-- Ідемпотентно: той самий файл застосовується до живої бази і при першому старті порожньої.

create table if not exists public.backtest_situations (
  id               text primary key,                 -- bt1-a01 … bt1-s20 (прогін-тип-номер)
  run_id           text not null,
  kind             text not null check (kind in ('archive', 'synthetic')),
  situation_type   text not null,                    -- access, timing, money, trial_start, …
  source_chat      text,                             -- slug ноди архіву (лише для kind = archive)
  source_title     text,
  source_ts        text,
  card             jsonb,                            -- картка угоди (лише синтетичні)
  context          jsonb not null default '[]',      -- [{ours, author, ts, text}]
  partner_message  text not null,
  real_reply       text,                             -- справжня відповідь (лише архівні)
  sort_order       integer not null,
  created_at       timestamptz not null default now()
);
create index if not exists backtest_situations_run_idx on public.backtest_situations (run_id, sort_order);

create table if not exists public.backtest_drafts (
  situation_id  text primary key references public.backtest_situations (id) on delete cascade,
  route         text not null check (route in ('draft', 'human', 'none')),  -- чернетка / «це людині» / пінга немає
  messages      jsonb not null default '[]',         -- 1–3 повідомлення чернетки
  why           text,                                -- «чому так»
  card_gap      text,                                -- чого не вистачило в картці
  model         text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.backtest_decisions (
  situation_id  text primary key references public.backtest_situations (id) on delete cascade,
  verdict       text not null check (verdict in ('same', 'no', 'edited')),
  edited_text   text,                                -- лише для verdict = edited
  note          text,
  decided_by    text,
  decided_at    timestamptz not null default now(),
  check ((verdict = 'edited') = (edited_text is not null))
);

notify pgrst, 'reload schema';
