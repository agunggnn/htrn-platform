-- Haturan Trade — Inventory & Stock Tracking Migration
-- Migration file: supabase/migrations/20260802000002_inventory.sql

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references items(id) on delete cascade,
  grade_code varchar(20) not null,
  movement_type varchar(20) not null, -- 'in' (PO received / harvest), 'out' (invoice shipped / export), 'adjustment'
  quantity decimal(15,3) not null,
  unit varchar(20) default 'kg',
  reference_type varchar(30),         -- 'purchase_order', 'invoice', 'manual'
  reference_id uuid,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_stock_movements_item on stock_movements(item_id, grade_code);
create index if not exists idx_stock_movements_created on stock_movements(created_at desc);

-- View for aggregated current stock by item & grade
create or replace view stock_summary as
select 
  i.id as item_id,
  i.name as item_name,
  i.name_en as item_name_en,
  i.unit,
  sm.grade_code,
  coalesce(sum(case when sm.movement_type = 'in' then sm.quantity else 0 end), 0) as total_in,
  coalesce(sum(case when sm.movement_type = 'out' then sm.quantity else 0 end), 0) as total_out,
  coalesce(sum(case when sm.movement_type = 'in' then sm.quantity when sm.movement_type = 'out' then -sm.quantity else sm.quantity end), 0) as current_stock
from items i
cross join item_grades ig
left join stock_movements sm on sm.item_id = i.id and sm.grade_code = ig.grade_code
where i.id = ig.item_id
group by i.id, i.name, i.name_en, i.unit, sm.grade_code;

-- RLS Policies
alter table stock_movements enable row level security;

create policy "Authenticated full access on stock_movements"
on stock_movements for all to authenticated
using (true) with check (true);
