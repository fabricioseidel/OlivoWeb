-- Core tables derived from blueprint section 4.1.
-- Uses IF NOT EXISTS guards so we can run safely on existing Supabase project.

create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_provider_id text unique not null,
  email text unique not null,
  display_name text,
  role_id uuid references public.app_roles(id),
  active boolean default true,
  last_login timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  phone text,
  address text,
  city text,
  region text,
  postal_code text,
  rut text unique,
  customer_type text default 'regular' check (customer_type in ('regular','vip','mayorista')),
  credit_limit numeric(10,2) default 0,
  credit_used numeric(10,2) default 0,
  total_purchases int default 0,
  total_spent numeric(15,2) default 0,
  last_purchase_date date,
  active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text unique,
  customer_id uuid references public.customers(id) on delete set null,
  subtotal numeric(15,2) not null default 0,
  discount numeric(15,2) default 0,
  tax numeric(15,2) default 0,
  total numeric(15,2) not null,
  payment_method text not null check (payment_method in ('cash','card','transfer','check','mixed')),
  status text default 'completed' check (status in ('pending','completed','cancelled','refunded')),
  notes text,
  seller_id uuid references public.app_users(id),
  created_by uuid references public.app_users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  discount numeric(10,2) default 0,
  tax numeric(10,2) default 0,
  subtotal numeric(15,2) not null,
  created_at timestamptz default now()
);

comment on table public.app_roles is 'RBAC roles for dashboard';
comment on table public.app_users is 'Mirror of authenticated users with role binding';
comment on table public.sales is 'Sales header for POS / dashboard';
comment on table public.sale_items is 'Sales detail lines';
