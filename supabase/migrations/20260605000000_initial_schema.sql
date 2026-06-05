-- Haturan Trade App — Initial Schema
-- Run in Supabase SQL Editor

-- Items (rempah)
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  name_en varchar(100),
  unit varchar(20) default 'kg',
  hs_code varchar(20),
  description text,
  is_active boolean default true
);

-- Grade per Item
create table if not exists item_grades (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  grade_code varchar(20),
  grade_description text,
  is_active boolean default true,
  unique(item_id, grade_code)
);

-- Supplier / Petani (defined before price_history which references it)
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null,
  contact_name varchar(100),
  phone varchar(30),
  region varchar(100),
  specialties text,
  is_active boolean default true,
  notes text
);

-- Harga Harian
create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id),
  grade_code varchar(20),
  price_per_unit decimal(15,2) not null,
  currency varchar(3) default 'IDR',
  price_date date not null,
  source_type varchar(20),
  supplier_id uuid references suppliers(id),
  notes text,
  created_at timestamptz default now(),
  unique(item_id, grade_code, price_date, source_type)
);

-- Company Profile (kop surat)
create table if not exists company_profile (
  id uuid primary key default gen_random_uuid(),
  company_name varchar(200) not null,
  tagline varchar(200),
  address text,
  phone varchar(30),
  email varchar(100),
  website varchar(100),
  npwp varchar(30),
  logo_url text,
  primary_color varchar(7) default '#1a472a',
  created_at timestamptz default now()
);

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name varchar(100),
  account_number varchar(50),
  account_name varchar(100),
  currency varchar(3) default 'IDR',
  is_primary boolean default false
);

create table if not exists signatories (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  title varchar(100),
  signature_url text,
  is_default boolean default false
);

-- Buyers
create table if not exists buyers (
  id uuid primary key default gen_random_uuid(),
  company_name varchar(200) not null,
  contact_name varchar(100),
  email varchar(100),
  phone varchar(30),
  country varchar(100),
  currency varchar(3) default 'USD',
  language varchar(2) default 'en',
  payment_terms varchar(50),
  tax_id varchar(50),
  notes text,
  source varchar(50),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Quotation
create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  quo_number varchar(50) unique,
  buyer_id uuid references buyers(id),
  date date default current_date,
  valid_until date,
  currency varchar(3) default 'USD',
  language varchar(2) default 'en',
  status varchar(20) default 'draft',
  subtotal decimal(15,2),
  tax_rate decimal(5,2) default 0,
  tax_amount decimal(15,2) default 0,
  total_amount decimal(15,2),
  payment_terms text,
  notes text,
  internal_notes text,
  signatory_id uuid references signatories(id),
  created_at timestamptz default now()
);

create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references quotations(id) on delete cascade,
  item_id uuid references items(id),
  grade_code varchar(20),
  quantity decimal(15,3),
  unit varchar(20),
  unit_price decimal(15,2),
  subtotal decimal(15,2),
  hs_code varchar(20),
  country_of_origin varchar(100) default 'Indonesia',
  sort_order int default 0
);

-- Invoice
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  inv_number varchar(50) unique,
  quotation_id uuid references quotations(id),
  buyer_id uuid references buyers(id),
  issue_date date default current_date,
  due_date date,
  currency varchar(3) default 'USD',
  exchange_rate decimal(15,4) default 1,
  language varchar(2) default 'en',
  status varchar(20) default 'draft',
  subtotal decimal(15,2),
  tax_rate decimal(5,2) default 0,
  tax_amount decimal(15,2) default 0,
  total_amount decimal(15,2),
  amount_paid decimal(15,2) default 0,
  amount_due decimal(15,2),
  payment_terms text,
  notes text,
  signatory_id uuid references signatories(id),
  created_at timestamptz default now()
);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  item_id uuid references items(id),
  grade_code varchar(20),
  description text,
  quantity decimal(15,3),
  unit varchar(20),
  unit_price decimal(15,2),
  subtotal decimal(15,2),
  hs_code varchar(20),
  country_of_origin varchar(100) default 'Indonesia',
  sort_order int default 0
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id),
  amount decimal(15,2),
  payment_date date,
  method varchar(30),
  reference_number varchar(100),
  notes text,
  created_at timestamptz default now()
);

-- Purchase Order ke Supplier
create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number varchar(50) unique,
  supplier_id uuid references suppliers(id),
  quotation_id uuid references quotations(id),
  status varchar(20) default 'draft',
  order_date date default current_date,
  expected_date date,
  received_date date,
  total_amount decimal(15,2),
  notes text,
  created_at timestamptz default now()
);

create table if not exists po_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid references purchase_orders(id) on delete cascade,
  item_id uuid references items(id),
  grade_code varchar(20),
  quantity_ordered decimal(15,3),
  quantity_received decimal(15,3),
  unit varchar(20),
  unit_price decimal(15,2),
  subtotal decimal(15,2)
);

-- Sequences untuk nomor dokumen
create sequence if not exists quo_seq start 1;
create sequence if not exists inv_seq start 1;
create sequence if not exists po_seq start 1;

-- Helper function untuk generate document numbers
create or replace function next_quo_number()
returns text language sql as $$
  select 'QUO/' || to_char(current_date, 'YYYY/MM') || '/' || lpad(nextval('quo_seq')::text, 3, '0')
$$;

create or replace function next_inv_number()
returns text language sql as $$
  select 'INV/' || to_char(current_date, 'YYYY/MM') || '/' || lpad(nextval('inv_seq')::text, 3, '0')
$$;

create or replace function next_po_number()
returns text language sql as $$
  select 'PO/' || to_char(current_date, 'YYYY/MM') || '/' || lpad(nextval('po_seq')::text, 3, '0')
$$;

-- Seed data: Default items (rempah utama Indonesia)
insert into items (name, name_en, unit, hs_code) values
  ('Cengkeh', 'Clove', 'kg', '0907'),
  ('Pala', 'Nutmeg', 'kg', '0908'),
  ('Lada Hitam', 'Black Pepper', 'kg', '0904'),
  ('Lada Putih', 'White Pepper', 'kg', '0904'),
  ('Kayu Manis', 'Cinnamon', 'kg', '0906'),
  ('Jahe', 'Ginger', 'kg', '0910'),
  ('Kunyit', 'Turmeric', 'kg', '0910')
on conflict do nothing;

-- Seed data: Default grades per item
insert into item_grades (item_id, grade_code, grade_description)
select i.id, g.grade_code, g.grade_description
from items i
cross join (values
  ('Super', 'Kualitas terbaik, besar seragam'),
  ('A', 'Kualitas premium'),
  ('B', 'Kualitas standar ekspor'),
  ('FAQ', 'Fair Average Quality — standar perdagangan umum')
) as g(grade_code, grade_description)
on conflict do nothing;
