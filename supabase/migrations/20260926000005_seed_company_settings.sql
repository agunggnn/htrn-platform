-- Migration: Seed Company Profile, Bank Accounts, and Default Signatory
-- Ensures proper company branding, bank details on invoices, and official signatories

-- 1. Company Profile
do $$
begin
  if exists (select 1 from company_profile limit 1) then
    update company_profile set
      company_name = 'PT Haturan Spice Indonesia',
      tagline = 'B2B Culinary & Food Ingredient Partner',
      address = 'Kawasan Pergudangan & Industri Sentul, Jl. Babakan Madang No. 88, Bogor, Jawa Barat 16810',
      phone = '+62 251 862 8888',
      email = 'commercial@haturan.com',
      website = 'https://haturan.com',
      npwp = '01.234.567.8-012.000',
      primary_color = '#1a472a',
      logo_url = '/icon.svg';
  else
    insert into company_profile (
      company_name,
      tagline,
      address,
      phone,
      email,
      website,
      npwp,
      primary_color,
      logo_url
    ) values (
      'PT Haturan Spice Indonesia',
      'B2B Culinary & Food Ingredient Partner',
      'Kawasan Pergudangan & Industri Sentul, Jl. Babakan Madang No. 88, Bogor, Jawa Barat 16810',
      '+62 251 862 8888',
      'commercial@haturan.com',
      'https://haturan.com',
      '01.234.567.8-012.000',
      '#1a472a',
      '/icon.svg'
    );
  end if;
end $$;

-- 2. Bank Accounts for Invoices & Quotations
do $$
begin
  -- Primary BCA Account
  if not exists (select 1 from bank_accounts where bank_name ilike '%BCA%') then
    insert into bank_accounts (bank_name, account_number, account_name, currency, is_primary)
    values ('Bank Central Asia (BCA)', '800-098-7654', 'PT Haturan Spice Indonesia', 'IDR', true);
  else
    update bank_accounts set
      account_name = 'PT Haturan Spice Indonesia',
      is_primary = true
    where bank_name ilike '%BCA%';
  end if;

  -- Secondary Mandiri Account
  if not exists (select 1 from bank_accounts where bank_name ilike '%Mandiri%') then
    insert into bank_accounts (bank_name, account_number, account_name, currency, is_primary)
    values ('Bank Mandiri', '133-00-9876543-2', 'PT Haturan Spice Indonesia', 'IDR', false);
  end if;
end $$;

-- 3. Default Signatory (Agung Gunawan - Direktur Utama)
do $$
begin
  if exists (select 1 from signatories where name ilike '%Agung Gunawan%') then
    update signatories set
      title = 'Direktur Utama',
      is_default = true
    where name ilike '%Agung Gunawan%';
  else
    insert into signatories (name, title, is_default)
    values ('Agung Gunawan', 'Direktur Utama', true);
  end if;
end $$;
