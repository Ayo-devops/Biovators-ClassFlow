alter table public.announcements
  add column if not exists mandatory boolean not null default false,
  add column if not exists pinned boolean not null default false;

create index if not exists announcements_priority_idx
  on public.announcements (pinned desc, created_at desc);
