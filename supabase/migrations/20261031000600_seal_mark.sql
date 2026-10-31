-- A pressed mark (an icon) instead of letters. Null means letters.
alter table public.profiles add column if not exists mark text check (mark is null or mark in ('moon','star','sun','comet','leaf','lotus','feather','key'));
