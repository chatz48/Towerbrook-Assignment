alter table public.discovery_candidates
  drop constraint if exists discovery_candidates_candidate_type_check;

alter table public.discovery_candidates
  add constraint discovery_candidates_candidate_type_check
  check (candidate_type in ('person', 'company', 'relationship', 'fact'));

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
      'expert_profile_completion',
      'missing_fact_enrichment',
      'refresh_theme',
      'ingest_source',
      'entity_refresh',
      'report_generation'
    )
  );
