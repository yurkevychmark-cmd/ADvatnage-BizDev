-- Схема BizDev на нашому сервері (таск 09620367).
--
-- Відтворено 07.10.2026 з коду порталу: проєкт Supabase, де жила справжня схема,
-- недоступний (DNS не резолвиться), а supabase/migrations описують лише 4 таблиці
-- з 8 і старі назви колонок. Якщо Supabase відновлять — ця схема замінюється
-- справжньою (pg_dump --schema-only), і дані переносяться в неї.
create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create table public.buyers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null default 'EXTERNAL',
  contact_name text,
  contact_email text,
  contact_telegram text,
  geo_expertise text[] not null default '{}',
  traffic_types text[] not null default '{}',
  monthly_budget_capacity numeric(12,2) default 0,
  compensation_model text,
  cooperation_model_value numeric(12,2),
  rating integer check (rating is null or (rating between 1 and 10)),
  notes text,
  worked_with boolean not null default false,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operators (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  brand_name text,
  contact text,
  payment_model text,
  target_geos text[] not null default '{}',
  budget_min numeric(12,2) default 0,
  budget_max numeric(12,2) default 0,
  preferred_traffic text[] not null default '{}',
  deal_type text not null default 'CPA',
  cpa_value numeric(10,2),
  revshare_pct numeric(5,2),
  spend_pct numeric(5,2),
  rating integer check (rating is null or (rating between 1 and 10)),
  notes text,
  links text[],
  brief_text text,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  score numeric(5,2) not null default 0,
  geo_overlap text[] not null default '{}',
  traffic_overlap text[] not null default '{}',
  budget_fit boolean not null default false,
  status text not null default 'suggested',
  pipeline_stage text not null default 'new',
  created_at timestamptz not null default now(),
  unique (buyer_id, operator_id)
);

create table public.match_comments (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  author text,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  match_id uuid references public.matches(id) on delete set null,
  buyer_id uuid references public.buyers(id) on delete set null,
  operator_id uuid references public.operators(id) on delete set null,
  deal_type text,
  pipeline_stage text not null default 'new',
  planned_spend numeric(12,2) not null default 0,
  expected_conversions integer not null default 0,
  avg_revenue_per_user numeric(10,2) not null default 0,
  cpa_payout numeric(10,2) not null default 0,
  revshare_pct numeric(5,2) default 0,
  buyer_fee numeric(12,2) default 0,
  side_costs numeric(12,2) default 0,
  accounts_fee_pct numeric(5,2) default 0,
  geos text[] not null default '{}',
  actual_spend numeric(12,2),
  actual_conversions integer,
  actual_revenue numeric(12,2),
  calc_cpa numeric(10,2),
  calc_ltv numeric(10,2),
  calc_roi numeric(8,2),
  calc_breakeven integer,
  report_columns jsonb not null default '[]',
  deal_terms_url text,
  invoice_url text,
  notes text,
  status text not null default 'draft',
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_entries (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entry_date date not null,
  granularity text not null default 'day',
  values jsonb not null default '{}',
  notes text,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  entity_type text,
  entity_id uuid,
  entity_name text,
  assigned_to text,
  start_date date,
  due_date date,
  priority text not null default 'medium',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  entity_type text,
  entity_name text,
  action text,
  created_at timestamptz not null default now()
);

create index idx_buyers_geos on public.buyers using gin (geo_expertise);
create index idx_operators_geos on public.operators using gin (target_geos);
create index idx_matches_buyer on public.matches(buyer_id);
create index idx_matches_operator on public.matches(operator_id);
create index idx_matches_score on public.matches(score desc);
create index idx_report_entries_project on public.report_entries(project_id, granularity, entry_date);
create index idx_activity_log_created on public.activity_log(created_at desc);

create trigger trg_buyers_updated before update on public.buyers for each row execute function public.set_updated_at();
create trigger trg_operators_updated before update on public.operators for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects for each row execute function public.set_updated_at();
