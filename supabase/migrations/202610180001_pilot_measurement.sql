create extension if not exists pgcrypto;

create table if not exists public.pilot_settings (
  id boolean primary key default true check (id),
  pilot_name text not null default 'Biovators first-semester pilot',
  pilot_start date not null default '2026-10-19',
  pilot_end date,
  eligible_students integer check (eligible_students is null or eligible_students > 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.pilot_events (
  id uuid primary key default gen_random_uuid(),
  device_hash text not null,
  event_type text not null check (
    event_type in (
      'page_view',
      'assignment_open',
      'assignment_marked_done',
      'material_download',
      'reminder_registered',
      'app_install_requested',
      'app_installed'
    )
  ),
  path text not null,
  event_day date not null,
  created_at timestamptz not null default now(),
  constraint pilot_event_daily_unique unique (device_hash, event_type, path, event_day)
);

create index if not exists pilot_events_day_idx
  on public.pilot_events (event_day desc, event_type);

create table if not exists public.pilot_feedback (
  id uuid primary key default gen_random_uuid(),
  feedback_type text not null check (
    feedback_type in ('feedback', 'suggestion', 'bug', 'incorrect_information', 'delivery_failure', 'support_request')
  ),
  area text not null,
  summary text not null,
  severity text not null check (severity in ('minor', 'disruptive', 'critical')),
  status text not null default 'new' check (status in ('new', 'investigating', 'resolved', 'deferred', 'declined')),
  affected_students integer check (affected_students is null or affected_students >= 0),
  resolution text,
  minutes_spent integer check (minutes_spent is null or minutes_spent >= 0),
  source text not null default 'administrator' check (source in ('student', 'course_rep', 'administrator', 'automatic_monitoring')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_role text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists pilot_feedback_status_idx
  on public.pilot_feedback (status, created_at desc);

alter table public.pilot_settings enable row level security;
alter table public.pilot_events enable row level security;
alter table public.pilot_feedback enable row level security;

insert into public.pilot_settings (id)
values (true)
on conflict (id) do nothing;

comment on table public.pilot_events is
  'Privacy-limited pilot measurements. Device identifiers are HMAC-hashed by the server; no names, contact details, IP addresses, message text or AI prompts are stored.';
