-- Tell the story of a flight: takeoff, halfway, landing.
alter table public.letters add column if not exists told_takeoff boolean not null default false;
alter table public.letters add column if not exists told_midway boolean not null default false;
update public.letters set told_takeoff = true, told_midway = true where arrive_at <= now() or notified;
