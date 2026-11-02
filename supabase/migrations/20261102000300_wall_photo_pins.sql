-- Pin just a Polaroid from a letter to your wall.
create table if not exists public.wall_pins (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references public.profiles on delete cascade,
  letter_id uuid not null references public.letters on delete cascade,
  media_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  unique (owner, media_path)
);
alter table public.wall_pins enable row level security;
create policy "your wall pins" on public.wall_pins for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()) and exists (
    select 1 from public.letters l where l.id = letter_id and l.recipient = (select auth.uid()) and l.opened_at is not null
      and (l.photo_path = media_path or l.scraps @> jsonb_build_array(jsonb_build_object('media_path', media_path)))));
create index if not exists wall_pins_owner_idx on public.wall_pins (owner, created_at desc);
