-- Seal edge: an uneven poured edge or a clean pressed one.
alter table public.profiles add column if not exists edge text not null default 'uneven' check (edge in ('uneven','clean'));
