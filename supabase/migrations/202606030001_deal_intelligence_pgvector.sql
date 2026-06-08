create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  title text not null,
  url text,
  publisher text,
  source_type text not null default 'submitted',
  raw_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  content text not null,
  token_count integer not null default 0,
  embedding vector(384),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.graph_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('person', 'company', 'fund', 'advisor_firm', 'law_firm', 'bank', 'deal', 'theme', 'source')),
  external_id text,
  name text not null,
  theme_ids text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, external_id)
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  theme text not null,
  geography text not null default 'Not captured',
  status text not null check (status in ('announced', 'completed', 'rumored', 'pending', 'failed')),
  deal_type text not null check (deal_type in ('acquisition', 'minority-investment', 'growth-equity', 'merger', 'carve-out', 'refinancing', 'jv')),
  announcement_date date,
  completion_date date,
  target_entity_id uuid references public.graph_entities(id),
  buyer_entity_id uuid references public.graph_entities(id),
  investor_entity_id uuid references public.graph_entities(id),
  seller_entity_id uuid references public.graph_entities(id),
  investment_relevance text not null,
  strategic_rationale text,
  completion_score numeric not null default 0 check (completion_score >= 0 and completion_score <= 1),
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  missing_facts text[] not null default '{}'::text[],
  follow_up_searches text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deal_parties (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  role text not null check (role in ('target', 'buyer', 'investor', 'seller', 'existing-shareholder', 'co-investor', 'management', 'board')),
  entity_id uuid references public.graph_entities(id),
  name text not null,
  note text,
  source_id uuid references public.sources(id),
  created_at timestamptz not null default now()
);

create table if not exists public.deal_advisors (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  role text not null check (role in ('financial-advisor-buyer', 'financial-advisor-seller', 'legal-counsel-buyer', 'legal-counsel-seller', 'commercial-diligence', 'technical-diligence', 'tax-accounting', 'other-advisor')),
  entity_id uuid references public.graph_entities(id),
  name text not null,
  note text,
  source_id uuid references public.sources(id),
  created_at timestamptz not null default now()
);

create table if not exists public.deal_facts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  fact_type text not null,
  fact_value text not null,
  normalized_value text,
  source_id uuid references public.sources(id),
  evidence_chunk_id uuid references public.source_chunks(id),
  evidence_text text,
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  extraction_method text not null check (extraction_method in ('curated', 'llm', 'heuristic', 'web_search')),
  review_status text not null check (review_status in ('verified', 'needs_review', 'missing', 'not_disclosed')),
  created_at timestamptz not null default now()
);

create table if not exists public.deal_fact_conflicts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  fact_type text not null,
  values text[] not null,
  note text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.deal_enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  trigger text not null default 'manual',
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  queries text[] not null default '{}'::text[],
  sources_found integer not null default 0,
  facts_created integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  from_entity_id uuid not null references public.graph_entities(id) on delete cascade,
  to_entity_id uuid not null references public.graph_entities(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  relationship_type text not null check (relationship_type in ('founded', 'co-founded', 'led', 'partner', 'board', 'advised', 'invested-in', 'acquired', 'banked', 'legal-counsel', 'served', 'financial-advisor-buyer', 'financial-advisor-seller', 'legal-counsel-buyer', 'legal-counsel-seller', 'commercial-diligence', 'technical-diligence', 'tax-accounting', 'other-advisor', 'target', 'buyer', 'investor', 'seller', 'existing-shareholder', 'co-investor', 'management')),
  source_id uuid references public.sources(id),
  evidence_text text,
  confidence numeric not null default 0.7 check (confidence >= 0 and confidence <= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sources_url on public.sources (url);
create index if not exists idx_source_chunks_source_id on public.source_chunks (source_id);
create index if not exists idx_source_chunks_metadata on public.source_chunks using gin (metadata);
create index if not exists idx_graph_entities_name on public.graph_entities using gin (to_tsvector('simple', name));
create index if not exists idx_graph_entities_entity_type on public.graph_entities (entity_type);
create index if not exists idx_graph_entities_theme_ids on public.graph_entities using gin (theme_ids);
create index if not exists idx_deals_theme on public.deals (theme);
create index if not exists idx_deals_status on public.deals (status);
create index if not exists idx_deals_external_id on public.deals (external_id);
create index if not exists idx_deal_facts_deal_id on public.deal_facts (deal_id);
create index if not exists idx_deal_facts_review_status on public.deal_facts (review_status);
create index if not exists idx_deal_parties_deal_id on public.deal_parties (deal_id);
create index if not exists idx_deal_advisors_deal_id on public.deal_advisors (deal_id);
create index if not exists idx_graph_edges_from_entity on public.graph_edges (from_entity_id);
create index if not exists idx_graph_edges_to_entity on public.graph_edges (to_entity_id);
create index if not exists idx_graph_edges_deal_id on public.graph_edges (deal_id);

create index if not exists idx_source_chunks_embedding
  on public.source_chunks
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
    )
  order by sc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.sources enable row level security;
alter table public.source_chunks enable row level security;
alter table public.graph_entities enable row level security;
alter table public.deals enable row level security;
alter table public.deal_parties enable row level security;
alter table public.deal_advisors enable row level security;
alter table public.deal_facts enable row level security;
alter table public.deal_fact_conflicts enable row level security;
alter table public.deal_enrichment_runs enable row level security;
alter table public.graph_edges enable row level security;
