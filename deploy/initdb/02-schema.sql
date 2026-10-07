-- Схема BizDev на нашому сервері (таск 09620367).
-- Згенеровано 07.10.2026 з опису живих таблиць Supabase-проєкту unipibjiywsluluavkgv
-- (PostgREST OpenAPI): усі таблиці й колонки, типи, not null, значення за замовчуванням,
-- первинні й зовнішні ключі. numeric — без точності, щоб жодне значення не округлилось.
-- Плюс колонки, яких потребує код, але немає в живій базі (CODE_ONLY у gen_schema.py).
-- on delete для зовнішніх ключів OpenAPI не показує — обрано за змістом (див. ON_DELETE).
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default 'INTERNAL',
  traffic_sources text[],
  languages text[],
  compensation_model text,
  expertise_tiers text[],
  expertise_geos text[],
  trust_rating integer default 5,
  infrastructure_costs jsonb,
  dynamic_data jsonb,
  created_at timestamptz default timezone('utc'::text, now()),
  contact_name text,
  contact_email text,
  contact_telegram text,
  geo_expertise text[],
  traffic_types text[],
  monthly_budget_capacity numeric default 0,
  rating integer,
  notes text,
  updated_at timestamptz default now(),
  cooperation_model text,
  cooperation_model_value numeric,
  worked_with boolean default false,
  sort_order integer
);

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  brand_name text,
  locations text[],
  payment_model text,
  budget_min numeric,
  budget_max numeric,
  conditions text,
  status text default 'UNKNOWN',
  tags text[],
  dynamic_data jsonb,
  created_at timestamptz default timezone('utc'::text, now()),
  name text,
  target_geos text[],
  preferred_traffic text[],
  deal_type text default 'CPA',
  cpa_value numeric,
  revshare_pct numeric,
  rating integer,
  notes text,
  updated_at timestamptz default now(),
  spend_pct numeric,
  contact text,
  payment_method text,
  links text[],
  brand text,
  sort_order integer,
  brief_text text
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid,
  operator_id uuid,
  status text default 'ACTIVE',
  spend numeric default 0,
  roi numeric default 0,
  start_date timestamptz default timezone('utc'::text, now()),
  end_date timestamptz,
  dynamic_data jsonb,
  score numeric not null default 0,
  geo_overlap text[] not null default '{}',
  traffic_overlap text[] not null default '{}',
  budget_fit boolean not null default false,
  pipeline_stage text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.match_comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid,
  author text not null,
  body text not null,
  created_at timestamptz default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  match_id uuid,
  buyer_id uuid,
  operator_id uuid,
  planned_spend numeric default 0,
  expected_conversions integer default 0,
  avg_revenue_per_user numeric default 0,
  cpa_payout numeric default 0,
  revshare_pct numeric default 0,
  calc_cpa numeric,
  calc_ltv numeric,
  calc_roi numeric,
  calc_breakeven integer,
  actual_spend numeric,
  actual_conversions integer,
  actual_revenue numeric,
  notes text,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  pipeline_stage text default 'new',
  deal_type text default 'CPA',
  buyer_fee numeric default 0,
  side_costs numeric default 0,
  sort_order integer,
  deal_terms_url text,
  invoice_url text,
  accounts_fee_pct numeric default 0,
  geos text[],
  report_columns jsonb
);

create table public.report_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  entry_date date not null,
  granularity text not null default 'day',
  values jsonb,
  notes text,
  created_at timestamptz default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  entity_type text,
  entity_id uuid,
  entity_name text,
  assigned_to text,
  due_date date,
  priority text not null default 'medium',
  status text not null default 'open',
  created_at timestamptz default now(),
  start_date date
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_name text not null,
  action text not null default 'created',
  created_at timestamptz default now()
);

create table public.profiles (
  id uuid primary key,
  email text not null,
  role text not null,
  approved boolean default false,
  buyer_id uuid,
  operator_id uuid,
  created_at timestamptz default now()
);

create table public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  intended_role text not null,
  intended_entity_id uuid,
  used boolean default false,
  expires_at timestamptz
);

alter table public.matches add foreign key (buyer_id) references public.buyers(id) on delete cascade;
alter table public.matches add foreign key (operator_id) references public.operators(id) on delete cascade;
alter table public.match_comments add foreign key (match_id) references public.matches(id) on delete cascade;
alter table public.projects add foreign key (match_id) references public.matches(id) on delete set null;
alter table public.projects add foreign key (buyer_id) references public.buyers(id) on delete set null;
alter table public.projects add foreign key (operator_id) references public.operators(id) on delete set null;
alter table public.report_entries add foreign key (project_id) references public.projects(id) on delete cascade;
alter table public.profiles add foreign key (buyer_id) references public.buyers(id) on delete set null;
alter table public.profiles add foreign key (operator_id) references public.operators(id) on delete set null;

-- upsert у matchmaking іде з onConflict buyer_id,operator_id
create unique index matches_buyer_operator_key on public.matches(buyer_id, operator_id);
create index idx_report_entries_project on public.report_entries(project_id, granularity, entry_date);
create index idx_activity_log_created on public.activity_log(created_at desc);

create trigger trg_buyers_updated before update on public.buyers for each row execute function public.set_updated_at();
create trigger trg_operators_updated before update on public.operators for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects for each row execute function public.set_updated_at();
