-- Safe migration: adds missing columns to existing tables
-- Run this in Supabase SQL Editor if tables already exist

create extension if not exists "uuid-ossp";

-- BUYERS: create if not exists, then add missing columns safely
create table if not exists public.buyers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.buyers
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_telegram text,
  add column if not exists geo_expertise text[] not null default '{}',
  add column if not exists traffic_types text[] not null default '{}',
  add column if not exists monthly_budget_capacity numeric(12,2) default 0,
  add column if not exists rating integer default null check (rating is null or (rating >= 1 and rating <= 10)),
  add column if not exists notes text;

-- OPERATORS: create if not exists, then add missing columns safely
create table if not exists public.operators (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operators
  add column if not exists brand text,
  add column if not exists target_geos text[] not null default '{}',
  add column if not exists budget_min numeric(12,2) default 0,
  add column if not exists budget_max numeric(12,2) default 0,
  add column if not exists preferred_traffic text[] not null default '{}',
  add column if not exists deal_type text not null default 'CPA',
  add column if not exists cpa_value numeric(10,2),
  add column if not exists revshare_pct numeric(5,2),
  add column if not exists rating integer default null check (rating is null or (rating >= 1 and rating <= 10)),
  add column if not exists notes text;

-- MATCHES: create if not exists
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  operator_id uuid not null references public.operators(id) on delete cascade,
  score numeric(5,2) not null default 0,
  geo_overlap text[] not null default '{}',
  traffic_overlap text[] not null default '{}',
  budget_fit boolean not null default false,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  unique(buyer_id, operator_id)
);

-- PROJECTS: create if not exists
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  match_id uuid references public.matches(id) on delete set null,
  buyer_id uuid references public.buyers(id) on delete set null,
  operator_id uuid references public.operators(id) on delete set null,
  planned_spend numeric(12,2) not null default 0,
  expected_conversions integer not null default 0,
  avg_revenue_per_user numeric(10,2) not null default 0,
  cpa_payout numeric(10,2) not null default 0,
  revshare_pct numeric(5,2) default 0,
  calc_cpa numeric(10,2),
  calc_ltv numeric(10,2),
  calc_roi numeric(8,2),
  calc_breakeven integer,
  notes text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes (safe to run multiple times)
create index if not exists idx_buyers_geos on public.buyers using gin (geo_expertise);
create index if not exists idx_operators_geos on public.operators using gin (target_geos);
create index if not exists idx_matches_buyer on public.matches(buyer_id);
create index if not exists idx_matches_operator on public.matches(operator_id);
create index if not exists idx_matches_score on public.matches(score desc);

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers (drop and recreate to avoid duplicate errors)
drop trigger if exists trg_buyers_updated on public.buyers;
create trigger trg_buyers_updated before update on public.buyers
  for each row execute function public.set_updated_at();

drop trigger if exists trg_operators_updated on public.operators;
create trigger trg_operators_updated before update on public.operators
  for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- RLS policies
alter table public.buyers enable row level security;
alter table public.operators enable row level security;
alter table public.matches enable row level security;
alter table public.projects enable row level security;

drop policy if exists "Allow all on buyers" on public.buyers;
drop policy if exists "Allow all on operators" on public.operators;
drop policy if exists "Allow all on matches" on public.matches;
drop policy if exists "Allow all on projects" on public.projects;

create policy "Allow all on buyers" on public.buyers for all using (true) with check (true);
create policy "Allow all on operators" on public.operators for all using (true) with check (true);
create policy "Allow all on matches" on public.matches for all using (true) with check (true);
create policy "Allow all on projects" on public.projects for all using (true) with check (true);
