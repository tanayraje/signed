-- Pin just a line from a letter to your wall, as a note.
alter table public.wall_pins alter column media_path drop not null;
alter table public.wall_pins add column if not exists quote text check (quote is null or char_length(quote) between 1 and 400);
alter table public.wall_pins add constraint wall_pins_photo_or_note check ((media_path is null) <> (quote is null));
create unique index if not exists wall_pins_note_once on public.wall_pins (owner, letter_id, quote) where quote is not null;

create policy "pin a line from a letter" on public.wall_pins for insert to authenticated
  with check (owner = (select auth.uid()) and quote is not null and media_path is null and exists (
    select 1 from public.letters l where l.id = letter_id and l.recipient = (select auth.uid()) and l.opened_at is not null));
