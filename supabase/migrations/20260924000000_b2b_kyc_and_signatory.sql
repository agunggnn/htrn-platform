-- Migration: 20260924000000_b2b_kyc_and_signatory.sql
-- Description: B2B KYC fields, quotation lead time & delivery terms, default signatory Agung Gunawan, and Haturan company profile

-- 1. Extend buyers table with B2B KYC and profiling fields
alter table buyers
add column if not exists buyer_tier varchar(10) default 'tier_2',
add column if not exists credit_limit decimal(15,2) default 0,
add column if not exists payment_terms_allowed varchar(20) default 'CBD',
add column if not exists preferred_packaging varchar(50) default 'bulk_10kg',
add column if not exists gacoan_similarity_score integer default 50,
add column if not exists kyc_verified boolean default false;

-- 2. Extend quotations table with B2B delivery terms and lead time
alter table quotations
add column if not exists lead_time_days integer default 7,
add column if not exists delivery_terms varchar(50) default 'Franco Jabodetabek';

-- 3. Ensure Agung Gunawan is the default signatory
update signatories set is_default = false where is_default = true;

insert into signatories (name, title, is_default)
values ('Agung Gunawan', 'Direktur', true)
on conflict do nothing;

-- 4. Set or update Company Profile for PT Haturan Spice Indonesia
do $$
begin
  if exists (select 1 from company_profile limit 1) then
    update company_profile set
      company_name = 'PT Haturan Spice Indonesia',
      tagline = 'B2B Culinary & Food Ingredient Partner',
      email = 'commercial@haturan.com',
      website = 'https://haturan.com',
      primary_color = '#1a472a';
  else
    insert into company_profile (company_name, tagline, email, website, primary_color)
    values (
      'PT Haturan Spice Indonesia',
      'B2B Culinary & Food Ingredient Partner',
      'commercial@haturan.com',
      'https://haturan.com',
      '#1a472a'
    );
  end if;
end $$;
