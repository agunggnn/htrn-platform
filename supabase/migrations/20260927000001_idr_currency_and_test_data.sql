-- Migration: 20260927000001_idr_currency_and_test_data.sql
-- 1. Standardize Currency to IDR (Rupiah) across all tables
-- 2. Add is_test flag to isolate testing/demo data from production accounting
-- 3. Create pricing_parameters master table (eliminating hardcoded variables)
-- 4. Create shopee_price_scrapes table for market crawler engine

-- 1. Currency Standardization to IDR
alter table if exists buyers
  alter column currency set default 'IDR';

update buyers
  set currency = 'IDR'
  where currency is null or currency = 'USD';

-- 2. Test Data Isolation Flag
do $$
begin
  -- quotations
  if not exists (select 1 from information_schema.columns where table_name = 'quotations' and column_name = 'is_test') then
    alter table quotations add column is_test boolean not null default false;
    create index if not exists idx_quotations_is_test on quotations(is_test);
  end if;

  -- invoices
  if not exists (select 1 from information_schema.columns where table_name = 'invoices' and column_name = 'is_test') then
    alter table invoices add column is_test boolean not null default false;
    create index if not exists idx_invoices_is_test on invoices(is_test);
  end if;

  -- purchase_orders
  if not exists (select 1 from information_schema.columns where table_name = 'purchase_orders' and column_name = 'is_test') then
    alter table purchase_orders add column is_test boolean not null default false;
    create index if not exists idx_purchase_orders_is_test on purchase_orders(is_test);
  end if;

  -- supplier_settlements
  if not exists (select 1 from information_schema.columns where table_name = 'supplier_settlements' and column_name = 'is_test') then
    alter table supplier_settlements add column is_test boolean not null default false;
    create index if not exists idx_supplier_settlements_is_test on supplier_settlements(is_test);
  end if;
end $$;

-- Mark existing demo / test simulation records as is_test = true
update quotations
  set is_test = true
  where quo_number ilike '%QUO/2026/09/001%' or quo_number ilike '%DEMO%' or quo_number ilike '%TEST%';

update invoices
  set is_test = true
  where invoice_number ilike '%INV/2026/09/001%' or invoice_number ilike '%DEMO%' or invoice_number ilike '%TEST%';

update purchase_orders
  set is_test = true
  where po_number ilike '%PO/2026/09/001%' or po_number ilike '%DEMO%' or po_number ilike '%TEST%';

update supplier_settlements
  set is_test = true
  where settlement_number ilike '%STL/2026/09/001%' or notes ilike '%simulasi%' or notes ilike '%test%';

-- 3. Dynamic Master Pricing Parameters Table
create table if not exists pricing_parameters (
  id uuid primary key default gen_random_uuid(),
  commodity_code varchar(50) not null default 'bawang_goreng_brebes',
  shrinkage_ratio decimal(5,2) not null default 3.80,
  processing_cost_per_kg decimal(12,2) not null default 11000.00,
  floor_margin_per_kg decimal(12,2) not null default 15000.00,
  raw_farmgate_price_per_kg decimal(12,2) not null default 30000.00,
  tier_1_margin decimal(12,2) not null default 40000.00,
  tier_2_margin decimal(12,2) not null default 30000.00,
  tier_3_margin decimal(12,2) not null default 24000.00,
  tier_4_margin decimal(12,2) not null default 19000.00,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by varchar(100) default 'System'
);

-- Seed initial master pricing parameters if empty
insert into pricing_parameters (
  commodity_code,
  shrinkage_ratio,
  processing_cost_per_kg,
  floor_margin_per_kg,
  raw_farmgate_price_per_kg,
  tier_1_margin,
  tier_2_margin,
  tier_3_margin,
  tier_4_margin
) select
  'bawang_goreng_brebes',
  3.80,
  11000.00,
  15000.00,
  30000.00,
  40000.00,
  30000.00,
  24000.00,
  19000.00
where not exists (
  select 1 from pricing_parameters where commodity_code = 'bawang_goreng_brebes'
);

-- 4. Shopee Wholesale Price Scrapes Table
create table if not exists shopee_price_scrapes (
  id uuid primary key default gen_random_uuid(),
  keyword varchar(100) not null default 'bawang goreng brebes',
  item_title text not null,
  shop_name varchar(200),
  shop_location varchar(100),
  price decimal(15,2) not null,
  price_min decimal(15,2),
  price_max decimal(15,2),
  rating decimal(3,2),
  historical_sold integer default 0,
  sold_display varchar(50),
  item_url text,
  is_pure boolean default true,
  adulteration_risk varchar(50) default 'Murni 100% Brebes',
  crawled_at timestamptz not null default now()
);

create index if not exists idx_shopee_scrapes_crawled on shopee_price_scrapes(crawled_at desc);
create index if not exists idx_shopee_scrapes_keyword on shopee_price_scrapes(keyword);
