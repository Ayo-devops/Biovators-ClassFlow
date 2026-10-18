create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'worker_started',
    'whatsapp_connected',
    'whatsapp_disconnected',
    'whatsapp_auth_failure',
    'ai_repeated_failures',
    'ai_recovered',
    'timetable_repeated_failures',
    'timetable_recovered'
  )),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  message text not null,
  source text not null default 'whatsapp_worker',
  dedupe_key text,
  details jsonb not null default '{}'::jsonb,
  alert_sent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.operational_events enable row level security;

create index if not exists operational_events_created_at_idx
  on public.operational_events (created_at desc);

create index if not exists operational_events_dedupe_idx
  on public.operational_events (dedupe_key, created_at desc);
