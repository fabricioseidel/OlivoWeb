-- Add `featured` column to products and reload PostgREST schema cache
-- Run in Supabase SQL editor

alter table if exists public.products
  add column if not exists featured boolean default false not null;

-- Optional: document the column
comment on column public.products.featured is 'Marks a product as featured for homepage and admin UI toggles';

-- Force PostgREST to reload the schema cache immediately
notify pgrst, 'reload schema';
