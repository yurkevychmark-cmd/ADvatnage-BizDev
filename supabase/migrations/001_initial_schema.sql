create extension if not exists "uuid-ossp";

-- BUYERS
create table public.buyers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  contact_name  text,
  contact_email text,
  contact_telegram text,
  geo_expertise text[] not null default '{}',
  traffic_types text[] not null default '{}',
  monthly_budget_capacity numeric(12,2) default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- OPERATORS
create table public.operators (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  brand             text,
  target_geos       text[] not null default '{}',
  budget_min        numeric(12,2) default 0,
  budget_max        numeric(12,2) default 0,
  preferred_traffic text[] not null default '{}',
  deal_type         text not null default 'CPA'
                      check (deal_type in ('CPA','RevShare','Hybrid')),
  cpa_value         numeric(10,2),
  revshare_pct      numeric(5,2),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- MATCHES
create table public.matches (
  id            uuid primary key default uuid_generate_v4(),
  buyer_id      uuid not null references public.buyers(id) on delete cascade,
  operator_id   uuid not null references public.operators(id) on delete cascade,
  score         numeric(5,2) not null,
  geo_overlap   text[] not null default '{}',
  traffic_overlap text[] not null default '{}',
  budget_fit    boolean not null default false,
  status        text not null default 'suggested'
                  check (status in ('suggested','accepted','rejected','active')),
  created_at    timestamptz not null default now(),
  unique(buyer_id, operator_id)
);

-- PROJECTS
create table public.projects (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  match_id        uuid references public.matches(id) on delete set null,
  buyer_id        uuid references public.buyers(id) on delete set null,
  operator_id     uuid references public.operators(id) on delete set null,
  planned_spend       numeric(12,2) not null default 0,
  expected_conversions integer not null default 0,
  avg_revenue_per_user numeric(10,2) not null default 0,
  cpa_payout           numeric(10,2) not null default 0,
  revshare_pct         numeric(5,2) default 0,
  calc_cpa         numeric(10,2),
  calc_ltv         numeric(10,2),
  calc_roi         numeric(8,2),
  calc_breakeven   integer,
  notes            text,
  status           text not null default 'draft'
                     check (status in ('draft','active','completed','cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- INDEXES
create index idx_buyers_geos on public.buyers using gin (geo_expertise);
create index idx_operators_geos on public.operators using gin (target_geos);
create index idx_matches_buyer on public.matches(buyer_id);
create index idx_matches_operator on public.matches(operator_id);
create index idx_matches_score on public.matches(score desc);

-- AUTO-UPDATE updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_buyers_updated before update on public.buyers
  for each row execute function public.set_updated_at();
create trigger trg_operators_updated before update on public.operators
  for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- RLS (internal tool - allow all)
alter table public.buyers enable row level security;
alter table public.operators enable row level security;
alter table public.matches enable row level security;
alter table public.projects enable row level security;

create policy "Allow all on buyers" on public.buyers for all using (true) with check (true);
create policy "Allow all on operators" on public.operators for all using (true) with check (true);
create policy "Allow all on matches" on public.matches for all using (true) with check (true);
create policy "Allow all on projects" on public.projects for all using (true) with check (true);
