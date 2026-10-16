alter table public.course_materials
  add column if not exists ai_text text,
  add column if not exists ai_status text not null default 'pending',
  add column if not exists ai_error text,
  add column if not exists ai_processed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'course_materials_ai_status_check'
  ) then
    alter table public.course_materials
      add constraint course_materials_ai_status_check
      check (ai_status in ('pending', 'ready', 'unsupported', 'failed'));
  end if;
end $$;

comment on column public.course_materials.ai_text is
  'Bounded plain text extracted from the private source file for ClassFlow AI retrieval.';
