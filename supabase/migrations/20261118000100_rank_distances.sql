-- Owl ranks need longer journeys: courier 10,000 km, senior 25,000, veteran 40,000, master 75,000.
create or replace function public.owl_speed(km integer) returns float8
language sql immutable set search_path = public as $$
  select case when km >= 75000 then 1.4 when km >= 40000 then 1.3 when km >= 25000 then 1.2 when km >= 10000 then 1.1 else 1.0 end;
$$;
