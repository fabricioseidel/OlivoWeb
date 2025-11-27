-- Fix Foreign Key constraint for orders table
-- The previous migration incorrectly referenced auth.users, but the app uses a custom public.users table for auth.

-- 1. Drop the incorrect constraint
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- 2. Add the correct constraint referencing public.users
ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;
