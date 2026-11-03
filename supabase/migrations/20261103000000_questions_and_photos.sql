-- Several questions and several Polaroids per letter.
alter table public.letters add column if not exists questions text[];
alter table public.letters add column if not exists photos jsonb check (photos is null or jsonb_typeof(photos) = 'array'); -- [{path, caption}]

create policy "read landed polaroids" on storage.objects for select to authenticated
  using (bucket_id = 'mail' and exists (select 1 from public.letters l
    where l.recipient = (select auth.uid()) and l.arrive_at <= now()
      and l.photos @> jsonb_build_array(jsonb_build_object('path', name))));

create policy "pin polaroids from a letter" on public.wall_pins for insert to authenticated
  with check (owner = (select auth.uid()) and exists (
    select 1 from public.letters l where l.id = letter_id and l.recipient = (select auth.uid()) and l.opened_at is not null
      and l.photos @> jsonb_build_array(jsonb_build_object('path', media_path))));

-- The welcome tour shows once per person (kept on the account, not the phone).
alter table public.profiles add column if not exists toured boolean not null default false;
update public.profiles set toured = true where onboarded;
