create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'classflow-files',
  'classflow-files',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.assignment_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id bigint not null references public.assignments(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_code text not null,
  course_title text not null,
  title text not null,
  description text,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists assignment_files_assignment_id_idx
  on public.assignment_files (assignment_id);
create index if not exists course_materials_course_idx
  on public.course_materials (course_code, created_at desc);

alter table public.assignment_files enable row level security;
alter table public.course_materials enable row level security;

-- Files stay private. ClassFlow's authenticated server routes use the service
-- key to create short-lived upload and download links after checking roles.
