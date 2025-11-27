-- Fix numeric precision for orders and order_items tables
-- Increase precision from (10,2) to (15,2) to handle larger amounts (up to 10 trillion)

ALTER TABLE public.orders 
  ALTER COLUMN total TYPE NUMERIC(15,2),
  ALTER COLUMN subtotal TYPE NUMERIC(15,2),
  ALTER COLUMN shipping_cost TYPE NUMERIC(15,2);

ALTER TABLE public.order_items
  ALTER COLUMN price TYPE NUMERIC(15,2);
