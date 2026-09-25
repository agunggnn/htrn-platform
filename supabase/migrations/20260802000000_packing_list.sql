-- Haturan Trade — Packing List & Shipping Schema Migration
-- Migration file: supabase/migrations/20260802000000_packing_list.sql

create table if not exists packing_lists (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  vessel_name varchar(200),
  port_of_loading varchar(100) default 'Tanjung Priok, Jakarta, Indonesia',
  port_of_destination varchar(100),
  shipping_marks text,
  total_net_weight decimal(15,3),
  total_gross_weight decimal(15,3),
  total_packages int,
  container_number varchar(50),
  seal_number varchar(50),
  created_at timestamptz default now()
);

create table if not exists packing_list_items (
  id uuid primary key default gen_random_uuid(),
  packing_list_id uuid references packing_lists(id) on delete cascade,
  invoice_item_id uuid references invoice_items(id) on delete set null,
  description text not null,
  packages int default 1,
  net_weight_per_package decimal(10,3),
  gross_weight_per_package decimal(10,3),
  total_net_weight decimal(15,3),
  total_gross_weight decimal(15,3),
  sort_order int default 0
);

-- RLS Policies
alter table packing_lists enable row level security;
alter table packing_list_items enable row level security;

create policy "Authenticated full access on packing_lists"
on packing_lists for all to authenticated
using (true) with check (true);

create policy "Authenticated full access on packing_list_items"
on packing_list_items for all to authenticated
using (true) with check (true);
