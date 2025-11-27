-- Suppliers base tables
-- Run this script in Supabase SQL editor or via supabase cli

-- Create suppliers table
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  phone text,
  whatsapp text,
  email text,
  notes text,
  lead_time_days integer,
  min_order_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure updated_at auto-updates
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_suppliers_updated_at on suppliers;
create trigger set_suppliers_updated_at
before update on suppliers
for each row
execute function set_updated_at();

-- Add optional reorder threshold on products (default 5 units)
alter table if exists products
add column if not exists reorder_threshold integer default 5;

-- Relation between products and suppliers (many-to-many with metadata)
create table if not exists product_suppliers (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(barcode) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  priority integer default 1,
  supplier_sku text,
  pack_size integer,
  unit_cost numeric,
  default_reorder_qty integer,
  reorder_threshold integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, supplier_id)
);

drop trigger if exists set_product_suppliers_updated_at on product_suppliers;
create trigger set_product_suppliers_updated_at
before update on product_suppliers
for each row
execute function set_updated_at();

create index if not exists idx_product_suppliers_product on product_suppliers(product_id);
create index if not exists idx_product_suppliers_supplier on product_suppliers(supplier_id);
