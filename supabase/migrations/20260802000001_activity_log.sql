-- Haturan Trade — Activity Log & Notifications Migration
-- Migration file: supabase/migrations/20260802000001_activity_log.sql

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  entity_type varchar(30) not null, -- 'quotation', 'invoice', 'purchase_order', 'buyer', 'price'
  entity_id uuid not null,
  action varchar(30) not null,     -- 'created', 'updated', 'status_changed', 'payment_recorded'
  description text not null,
  details jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_activity_log_entity on activity_log(entity_type, entity_id);
create index if not exists idx_activity_log_created on activity_log(created_at desc);

-- RLS Policies
alter table activity_log enable row level security;

create policy "Authenticated full access on activity_log"
on activity_log for all to authenticated
using (true) with check (true);
