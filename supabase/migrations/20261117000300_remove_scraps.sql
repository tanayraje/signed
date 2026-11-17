-- Scraps and pockets are gone. Letters that already carried a bundle stay readable (letters.scraps is kept).
drop function if exists public.send_pocket_for(uuid, uuid);
drop function if exists public.send_pocket(uuid);
drop table if exists public.scraps;
alter table public.friend_settings drop column if exists post_day, drop column if exists auto_post, drop column if exists last_auto_post;
