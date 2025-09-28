-- Fix categories timestamps + trigger
-- Run this in Supabase SQL editor

-- 1) Ensure timestamp columns exist
alter table if exists public.categories
  add column if not exists created_at timestamptz default now() not null,
  add column if not exists updated_at timestamptz default now() not null;

-- 2) (Re)create a simple trigger function to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3) Attach the trigger to categories
drop trigger if exists trg_categories_set_updated_at on public.categories;
create trigger trg_categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

-- Optional: If you prefer disabling the existing trigger instead of adding columns,
-- uncomment the following line to drop it (NOT RECOMMENDED if you want updated_at to work):
-- drop trigger if exists trg_categories_set_updated_at on public.categories;
