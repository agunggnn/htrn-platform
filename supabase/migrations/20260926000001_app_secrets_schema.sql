-- Migration: 20260926000001_app_secrets_schema.sql
-- Description: Encrypted app secrets and Hetzer secretRef vault storage

create table if not exists app_secrets (
  key varchar(100) primary key,
  encrypted_value text not null,
  secret_ref varchar(100) not null,
  category varchar(50) not null default 'general',
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index by category and active status
create index if not exists idx_app_secrets_category on app_secrets(category);
create index if not exists idx_app_secrets_active on app_secrets(is_active);

-- Enable RLS
alter table app_secrets enable row level security;

-- Revoke all permissions from public/anon
revoke all on app_secrets from anon, public;
grant all on app_secrets to service_role;
grant select on app_secrets to authenticated;

-- Strict policy: service_role has full access, authenticated users have read access for app settings
do $$
begin
  drop policy if exists "Allow all for authenticated users and service role" on app_secrets;
  
  if not exists (
    select 1 from pg_policies where tablename = 'app_secrets' and policyname = 'Allow service_role full access'
  ) then
    create policy "Allow service_role full access" on app_secrets
      for all
      to service_role
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where tablename = 'app_secrets' and policyname = 'Allow authenticated users read access'
  ) then
    create policy "Allow authenticated users read access" on app_secrets
      for select
      to authenticated
      using (true);
  end if;
end $$;
