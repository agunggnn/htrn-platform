-- Migration: 20260927000000_supplier_settlements.sql
-- Description: Phase 4 Roadmap - Commission & Supplier Settlement Tracker (CV Daun Mas / Mas Parmin Hub Bogor)

create table if not exists supplier_settlements (
  id uuid primary key default gen_random_uuid(),
  settlement_number varchar(50) unique not null,
  quotation_id uuid references quotations(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete restrict,
  buyer_id uuid references buyers(id) on delete set null,
  commodity_name varchar(150) not null default 'Bawang Merah Goreng',
  grade_code varchar(50) default 'GRADE_A_SLICE',
  volume_kg numeric(12,2) not null check (volume_kg > 0),
  selling_price_per_kg numeric(15,2) not null check (selling_price_per_kg >= 0),
  total_buyer_payment numeric(15,2) not null check (total_buyer_payment >= 0),
  supplier_hpp_per_kg numeric(15,2) not null default 125000 check (supplier_hpp_per_kg >= 0),
  total_supplier_hpp numeric(15,2) not null check (total_supplier_hpp >= 0),
  packaging_cost numeric(15,2) not null default 0 check (packaging_cost >= 0),
  delivery_cost numeric(15,2) not null default 0 check (delivery_cost >= 0),
  gross_profit numeric(15,2) not null,
  gross_margin_pct numeric(5,2) not null,
  commission_rate_pct numeric(5,2) default 0,
  commission_amount numeric(15,2) default 0,
  net_supplier_payout numeric(15,2) not null check (net_supplier_payout >= 0),
  platform_net_profit numeric(15,2) not null,
  status varchar(30) not null default 'pending' check (status in ('pending', 'approved', 'in_progress', 'paid', 'reconciled')),
  settlement_date date,
  payment_method varchar(50) default 'bank_transfer',
  bank_reference varchar(100),
  bast_signed_url text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexing for fast analytics & filtering
create index if not exists idx_supplier_settlements_supplier on supplier_settlements(supplier_id);
create index if not exists idx_supplier_settlements_quotation on supplier_settlements(quotation_id);
create index if not exists idx_supplier_settlements_invoice on supplier_settlements(invoice_id);
create index if not exists idx_supplier_settlements_status on supplier_settlements(status);

-- Enable Row Level Security
alter table supplier_settlements enable row level security;

-- Policies for authenticated users
create policy "Authenticated users can view supplier settlements"
  on supplier_settlements
  for select
  to authenticated
  using (true);

create policy "Authenticated users can create supplier settlements"
  on supplier_settlements
  for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update supplier settlements"
  on supplier_settlements
  for update
  to authenticated
  using (true)
  with check (true);

-- Seed initial settlement record for deal QUO/2026/09/001 & INV/2026/09/001
do $$
declare
  v_quo_id uuid;
  v_inv_id uuid;
  v_supplier_id uuid;
  v_buyer_id uuid;
begin
  select id into v_quo_id from quotations where quo_number = 'QUO/2026/09/001' limit 1;
  select id into v_inv_id from invoices where inv_number = 'INV/2026/09/001' limit 1;
  select id into v_supplier_id from suppliers where name ilike '%Daun Mas%' or name ilike '%Mas Parmin%' limit 1;
  select id into v_buyer_id from buyers where company_name ilike '%Bakso Boedjangan%' limit 1;

  if v_quo_id is not null and v_supplier_id is not null then
    insert into supplier_settlements (
      settlement_number,
      quotation_id,
      invoice_id,
      supplier_id,
      buyer_id,
      commodity_name,
      grade_code,
      volume_kg,
      selling_price_per_kg,
      total_buyer_payment,
      supplier_hpp_per_kg,
      total_supplier_hpp,
      packaging_cost,
      delivery_cost,
      gross_profit,
      gross_margin_pct,
      commission_rate_pct,
      commission_amount,
      net_supplier_payout,
      platform_net_profit,
      status,
      notes
    ) values (
      'STL/2026/09/001',
      v_quo_id,
      v_inv_id,
      v_supplier_id,
      v_buyer_id,
      'Bawang Merah Goreng',
      'GRADE_A_SLICE',
      500,
      155000,
      77500000,
      125000,
      62500000,
      300000,
      350000,
      14350000,
      18.52,
      0,
      0,
      62500000,
      14350000,
      'pending',
      'Fulfillment Mas Parmin Hub Bogor (100 bal @ 5kg, 25 karton master box ganda inner PE). Franco Bandung. Menunggu transfer pelunasan invoice buyer CBD sebelum pencairan modal.'
    ) on conflict (settlement_number) do nothing;
  end if;
end $$;
