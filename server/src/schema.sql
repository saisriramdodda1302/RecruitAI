create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null,
  rubric jsonb,
  rubric_status text not null default 'pending'
    check (rubric_status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists jobs_user_idx on jobs (user_id, created_at desc);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  file_name text not null,
  text_hash text not null,
  resume text not null,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'done', 'failed')),
  error text,
  name text,
  email text,
  phone text,
  profile jsonb,
  ratings jsonb,
  summary text,
  strengths jsonb,
  gaps jsonb,
  score numeric(5, 1),
  meets_must boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, text_hash)
);

create index if not exists candidates_rank_idx
  on candidates (job_id, meets_must desc nulls last, score desc nulls last);
