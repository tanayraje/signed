-- Marks redrawn as pressed reliefs: a new, more personal set.
alter table public.profiles drop constraint if exists profiles_mark_check;
update public.profiles set mark = null where mark is not null and mark not in ('owl','letter','quill','comet','moon','sprig','key','rose');
alter table public.profiles add constraint profiles_mark_check check (mark is null or mark in ('owl','letter','quill','comet','moon','sprig','key','rose'));
