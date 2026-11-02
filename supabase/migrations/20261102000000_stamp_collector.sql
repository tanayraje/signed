-- Stamp collector: cut stamps from photos; a stamp that goes out on a letter
-- becomes the recipient's for good, postmarked with where and when it was sent.
alter table public.stamps
  add column if not exists cutter text not null default 'classic' check (cutter in ('classic', 'square', 'wide', 'oval')),
  add column if not exists caption text check (char_length(caption) <= 40),
  add column if not exists made_by uuid references public.profiles on delete set null,
  add column if not exists from_user uuid references public.profiles on delete set null,
  add column if not exists status text not null default 'mine' check (status in ('mine', 'flying', 'collected')),
  add column if not exists letter_id uuid references public.letters on delete set null,
  add column if not exists postmark_place text,
  add column if not exists postmark_at timestamptz,
  add column if not exists collected_at timestamptz;
update public.stamps set made_by = owner where made_by is null;
alter table public.stamps alter column made_by set default auth.uid();
create index if not exists stamps_owner_idx on public.stamps (owner, status);
create index if not exists stamps_made_by_idx on public.stamps (made_by);

alter policy "your stamps" on public.stamps
  using (owner = (select auth.uid()) and status = 'mine')
  with check (owner = (select auth.uid()) and made_by = (select auth.uid()) and status = 'mine'
    and from_user is null and letter_id is null and postmark_at is null
    and split_part(image_path, '/', 1) = (select auth.uid())::text);
create policy "see stamps you hold or made" on public.stamps for select to authenticated
  using (owner = (select auth.uid()) or made_by = (select auth.uid()));

-- When a letter carries a cut stamp, hand the stamp to the recipient and postmark it.
create or replace function public.post_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.stamp like 'custom:%' then
    update stamps set owner = new.recipient, from_user = new.sender, status = 'flying', letter_id = new.id,
      postmark_place = new.from_place, postmark_at = new.sent_at
    where id::text = substr(new.stamp, 8) and owner = new.sender and status = 'mine';
    if not found then raise exception 'That stamp has already been sent'; end if;
  end if;
  return null;
end $$;
create trigger letters_post_stamp after insert on public.letters for each row execute function public.post_stamp();

-- Opening a letter files its stamp into the collection.
create or replace function public.open_letter(letter_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update letters set opened_at = coalesce(opened_at, now())
  where id = open_letter.letter_id and recipient = auth.uid() and arrive_at <= now();
  if found then
    update stamps set status = 'collected', collected_at = coalesce(collected_at, now())
    where stamps.letter_id = open_letter.letter_id and owner = auth.uid() and status = 'flying';
  end if;
end $$;

-- Whoever holds a stamp can see its picture.
create policy "read stamps you hold" on storage.objects for select to authenticated
  using (bucket_id = 'mail' and exists (select 1 from public.stamps s where s.image_path = name and s.owner = (select auth.uid())));
