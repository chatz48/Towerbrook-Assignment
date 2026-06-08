create extension if not exists pgcrypto;
create extension if not exists vector;

drop function if exists public.match_source_chunks(vector(384), integer, jsonb);
drop function if exists public.match_source_chunks(vector(1536), integer, jsonb);
drop function if exists public.match_source_chunks(vector(384), integer, jsonb);
drop index if exists public.idx_source_chunks_embedding;

alter table if exists public.sources
  add column if not exists storage_path text,
  add column if not exists content_hash text,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'stale', 'dead', 'blocked', 'archived')),
  add column if not exists last_checked_at timestamptz,
  add column if not exists published_at timestamptz;

alter table if exists public.source_chunks
  add column if not exists theme_ids text[] not null default '{}'::text[],
  add column if not exists person_ids uuid[] not null default '{}'::uuid[],
  add column if not exists company_ids uuid[] not null default '{}'::uuid[],
  add column if not exists relationship_ids uuid[] not null default '{}'::uuid[],
  alter column embedding type vector(384) using null::vector(384);

create table if not exists public.themes (
  id text primary key,
  name text not null,
  short_name text not null,
  description text not null,
  keywords text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  headline text,
  current_organization text,
  location text,
  expert_type text not null default 'operator'
    check (expert_type in ('ex-founder', 'operator', 'advisor', 'banker', 'lawyer', 'service-provider', 'investor', 'regulator', 'consultant')),
  theme_ids text[] not null default '{}'::text[],
  specialties text[] not null default '{}'::text[],
  linkedin_url text,
  website text,
  summary text,
  why_relevant text,
  relevance_score numeric not null default 0 check (relevance_score >= 0 and relevance_score <= 100),
  momentum_score numeric not null default 0 check (momentum_score >= 0 and momentum_score <= 100),
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  aliases text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  category text not null default 'target'
    check (category in ('target', 'advisory', 'service-provider', 'investor', 'incumbent', 'fund', 'bank', 'law-firm')),
  theme_ids text[] not null default '{}'::text[],
  specialties text[] not null default '{}'::text[],
  website text,
  hq text,
  description text,
  why_interesting text,
  ownership_status text,
  owner text,
  stage text,
  size_band text,
  relevance_score numeric not null default 0 check (relevance_score >= 0 and relevance_score <= 100),
  momentum_score numeric not null default 0 check (momentum_score >= 0 and momentum_score <= 100),
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  aliases text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type text not null
    check (organization_type in ('fund', 'advisor', 'law-firm', 'bank', 'consultancy', 'regulator', 'conference', 'publisher', 'other')),
  website text,
  theme_ids text[] not null default '{}'::text[],
  aliases text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_type, name)
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type text not null default 'conference',
  theme_ids text[] not null default '{}'::text[],
  event_date text,
  location text,
  source_id uuid references public.sources(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.extraction_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  job_id uuid,
  provider text not null default 'deepseek',
  model text,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  input_hash text,
  entities_created integer not null default 0,
  relationships_created integer not null default 0,
  facts_created integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  from_entity_type text not null check (from_entity_type in ('person', 'company', 'organization', 'deal', 'event', 'theme')),
  from_entity_id uuid,
  to_entity_type text not null check (to_entity_type in ('person', 'company', 'organization', 'deal', 'event', 'theme')),
  to_entity_id uuid,
  theme_id text references public.themes(id),
  relationship_type text not null,
  source_id uuid references public.sources(id) on delete set null,
  evidence_chunk_id uuid references public.source_chunks(id) on delete set null,
  evidence_text text,
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  extraction_run_id uuid references public.extraction_runs(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'conflicting', 'superseded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facts (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('person', 'company', 'organization', 'deal', 'event', 'theme', 'relationship')),
  subject_id uuid,
  fact_type text not null,
  fact_value text not null,
  normalized_value text,
  theme_id text references public.themes(id),
  source_id uuid references public.sources(id) on delete set null,
  evidence_chunk_id uuid references public.source_chunks(id) on delete set null,
  evidence_text text,
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  extraction_method text not null default 'llm'
    check (extraction_method in ('curated', 'llm', 'heuristic', 'web_search', 'user_upload', 'call_notes')),
  extraction_run_id uuid references public.extraction_runs(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'conflicting', 'superseded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.fact_conflicts (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid,
  fact_type text not null,
  fact_ids uuid[] not null default '{}'::uuid[],
  values text[] not null,
  note text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.entity_embeddings (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('person', 'company', 'organization', 'deal', 'event', 'theme')),
  entity_id uuid not null,
  profile_text text not null,
  embedding vector(384),
  embedding_model text not null default 'BAAI/bge-small-en-v1.5',
  profile_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, embedding_model)
);

create table if not exists public.relationship_embeddings (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  profile_text text not null,
  embedding vector(384),
  embedding_model text not null default 'BAAI/bge-small-en-v1.5',
  profile_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (relationship_id, embedding_model)
);

create table if not exists public.theme_snapshots (
  id uuid primary key default gen_random_uuid(),
  theme_id text not null references public.themes(id),
  title text not null,
  summary text not null,
  source_count integer not null default 0,
  people_count integer not null default 0,
  company_count integer not null default 0,
  relationship_count integer not null default 0,
  embedding vector(384),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.research_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null
    check (job_type in ('deep_discovery', 'refresh_theme', 'ingest_source', 'entity_refresh', 'report_generation')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  theme_id text references public.themes(id),
  target_type text,
  target_id uuid,
  query text,
  priority integer not null default 50,
  progress_completed integer not null default 0,
  progress_total integer not null default 0,
  sources_found integer not null default 0,
  entities_created integer not null default 0,
  relationships_created integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

alter table public.extraction_runs
  add constraint extraction_runs_job_id_fkey
  foreign key (job_id) references public.research_jobs(id) on delete set null;

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  title text,
  context_type text,
  context_id uuid,
  theme_id text references public.themes(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tool_calls (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade,
  message_id uuid references public.chat_messages(id) on delete set null,
  tool_name text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  status text not null default 'completed'
    check (status in ('queued', 'running', 'completed', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null
    check (report_type in ('theme_memo', 'expert_call_prep', 'company_brief', 'red_team', 'relationship_map', 'custom')),
  title text not null,
  theme_id text references public.themes(id),
  subject_type text,
  subject_id uuid,
  markdown text not null,
  citations jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete set null,
  theme_id text references public.themes(id),
  purpose text not null,
  subject text not null,
  body text not null,
  citations jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.linkedin_profile_links (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete set null,
  name text not null,
  company text,
  role text,
  profile_url text not null,
  confidence numeric not null default 0.6 check (confidence >= 0 and confidence <= 1),
  search_query text not null,
  source_url text,
  created_at timestamptz not null default now(),
  unique (profile_url)
);

insert into public.themes (id, name, short_name, description, keywords)
values
  (
    'clean-energy-advisory',
    'Clean Energy Advisory & Development',
    'Clean Energy',
    'Advisory, development, and service providers around clean energy assets and platforms.',
    array['clean energy advisory', 'renewable energy development', 'solar development', 'wind development', 'energy transition advisory']
  ),
  (
    'grid-infrastructure',
    'Grid Infrastructure & Connection',
    'Grid Infrastructure',
    'Grid connection, interconnection, transmission, distribution, and infrastructure services.',
    array['grid connection', 'interconnection queue', 'transmission infrastructure', 'distribution network operator', 'grid infrastructure']
  ),
  (
    'smart-water',
    'Smart Water Infrastructure & Analytics',
    'Smart Water',
    'Water infrastructure analytics, monitoring, leakage, metering, and asset intelligence.',
    array['smart water', 'water analytics', 'leak detection', 'water infrastructure software', 'smart metering water']
  )
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  keywords = excluded.keywords,
  updated_at = now();

create index if not exists idx_people_name on public.people using gin (to_tsvector('simple', name));
create index if not exists idx_people_theme_ids on public.people using gin (theme_ids);
create index if not exists idx_people_linkedin_url on public.people (linkedin_url);
create index if not exists idx_companies_name on public.companies using gin (to_tsvector('simple', name));
create index if not exists idx_companies_theme_ids on public.companies using gin (theme_ids);
create index if not exists idx_companies_website on public.companies (website);
create index if not exists idx_organizations_theme_ids on public.organizations using gin (theme_ids);
create index if not exists idx_relationships_from on public.relationships (from_entity_type, from_entity_id);
create index if not exists idx_relationships_to on public.relationships (to_entity_type, to_entity_id);
create index if not exists idx_relationships_theme on public.relationships (theme_id);
create index if not exists idx_relationships_source_id on public.relationships (source_id);
create index if not exists idx_facts_subject on public.facts (subject_type, subject_id);
create index if not exists idx_facts_theme on public.facts (theme_id);
create index if not exists idx_research_jobs_status_priority on public.research_jobs (status, priority desc, queued_at);
create index if not exists idx_chat_messages_session_id on public.chat_messages (session_id);
create index if not exists idx_tool_calls_session_id on public.tool_calls (session_id);
create index if not exists idx_source_chunks_theme_ids on public.source_chunks using gin (theme_ids);
create index if not exists idx_source_chunks_person_ids on public.source_chunks using gin (person_ids);
create index if not exists idx_source_chunks_company_ids on public.source_chunks using gin (company_ids);

create index if not exists idx_source_chunks_embedding
  on public.source_chunks
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create index if not exists idx_entity_embeddings_embedding
  on public.entity_embeddings
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create index if not exists idx_relationship_embeddings_embedding
  on public.relationship_embeddings
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create or replace function public.match_source_chunks(
  query_embedding vector(384),
  match_count integer default 8,
  filter jsonb default '{}'::jsonb
)
returns table (
  chunk_id uuid,
  source_id uuid,
  content text,
  title text,
  url text,
  publisher text,
  metadata jsonb,
  similarity double precision
)
language sql stable
as $$
  select
    sc.id as chunk_id,
    sc.source_id,
    sc.content,
    s.title,
    s.url,
    s.publisher,
    sc.metadata,
    1 - (sc.embedding <=> query_embedding) as similarity
  from public.source_chunks sc
  join public.sources s on s.id = sc.source_id
  where sc.embedding is not null
    and (
      filter = '{}'::jsonb
      or sc.metadata @> filter
      or s.metadata @> filter
      or (filter ? 'theme_id' and (filter->>'theme_id') = any(sc.theme_ids))
      or (filter ? 'theme' and (filter->>'theme') = any(sc.theme_ids))
    )
  order by sc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.match_entity_embeddings(
  query_embedding vector(384),
  match_count integer default 8,
  filter jsonb default '{}'::jsonb
)
returns table (
  embedding_id uuid,
  entity_type text,
  entity_id uuid,
  profile_text text,
  metadata jsonb,
  similarity double precision
)
language sql stable
as $$
  select
    ee.id as embedding_id,
    ee.entity_type,
    ee.entity_id,
    ee.profile_text,
    ee.metadata,
    1 - (ee.embedding <=> query_embedding) as similarity
  from public.entity_embeddings ee
  where ee.embedding is not null
    and (
      filter = '{}'::jsonb
      or ee.metadata @> filter
      or (filter ? 'entity_type' and ee.entity_type = filter->>'entity_type')
    )
  order by ee.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.match_relationship_embeddings(
  query_embedding vector(384),
  match_count integer default 8,
  filter jsonb default '{}'::jsonb
)
returns table (
  embedding_id uuid,
  relationship_id uuid,
  profile_text text,
  metadata jsonb,
  similarity double precision
)
language sql stable
as $$
  select
    re.id as embedding_id,
    re.relationship_id,
    re.profile_text,
    re.metadata,
    1 - (re.embedding <=> query_embedding) as similarity
  from public.relationship_embeddings re
  where re.embedding is not null
    and (filter = '{}'::jsonb or re.metadata @> filter)
  order by re.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.themes enable row level security;
alter table public.people enable row level security;
alter table public.companies enable row level security;
alter table public.organizations enable row level security;
alter table public.events enable row level security;
alter table public.relationships enable row level security;
alter table public.facts enable row level security;
alter table public.fact_conflicts enable row level security;
alter table public.entity_embeddings enable row level security;
alter table public.relationship_embeddings enable row level security;
alter table public.theme_snapshots enable row level security;
alter table public.research_jobs enable row level security;
alter table public.extraction_runs enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.tool_calls enable row level security;
alter table public.reports enable row level security;
alter table public.email_drafts enable row level security;
alter table public.linkedin_profile_links enable row level security;
