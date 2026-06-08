alter table public.research_jobs
  drop constraint if exists research_jobs_job_type_check;

alter table public.research_jobs
  add constraint research_jobs_job_type_check
  check (
    job_type in (
      'deep_discovery',
      'founder_origination',
      'advisor_expert_gap',
      'identity_resolution',
      'refresh_theme',
      'ingest_source',
      'entity_refresh',
      'report_generation'
    )
  );

create table if not exists public.discovery_candidates (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  candidate_type text not null
    check (candidate_type in ('person', 'company', 'relationship')),
  name text not null,
  theme_ids text[] not null default '{}'::text[],
  priority numeric not null default 0 check (priority >= 0 and priority <= 100),
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'approved', 'rejected', 'merged')),
  source_ids uuid[] not null default '{}'::uuid[],
  job_id uuid references public.research_jobs(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  canonical_entity_type text,
  canonical_entity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entity_match_candidates (
  id uuid primary key default gen_random_uuid(),
  discovery_candidate_id uuid not null
    references public.discovery_candidates(id) on delete cascade,
  canonical_entity_type text not null check (canonical_entity_type in ('person', 'company')),
  canonical_entity_id uuid not null,
  match_method text not null,
  match_score numeric not null check (match_score >= 0 and match_score <= 1),
  evidence jsonb not null default '{}'::jsonb,
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (discovery_candidate_id, canonical_entity_type, canonical_entity_id, match_method)
);

create index if not exists idx_discovery_candidates_type_priority
  on public.discovery_candidates (candidate_type, priority desc);
create index if not exists idx_discovery_candidates_review_status
  on public.discovery_candidates (review_status, priority desc);
create index if not exists idx_discovery_candidates_theme_ids
  on public.discovery_candidates using gin (theme_ids);
create index if not exists idx_discovery_candidates_job_id
  on public.discovery_candidates (job_id);
create index if not exists idx_entity_match_candidates_review_status
  on public.entity_match_candidates (review_status, match_score desc);

alter table public.discovery_candidates enable row level security;
alter table public.entity_match_candidates enable row level security;
