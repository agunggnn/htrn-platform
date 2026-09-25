-- Migration: 20260924000003_seed_bawang_goreng_product.sql
-- Description: Seed Bawang Merah Goreng, Item Grades, Mas Parmin Supplier, and Tiered Pricing History

do $$
declare
  v_supplier_id uuid;
  v_item_id uuid;
  v_today date := current_date;
  v_d date;
begin
  -- 1. Ensure Supplier: CV Daun Mas / Panca Mas (Mas Parmin)
  select id into v_supplier_id from suppliers where name like '%Daun Mas%' limit 1;
  
  if v_supplier_id is null then
    insert into suppliers (name, contact_name, phone, region, specialties, is_active, notes)
    values (
      'CV Daun Mas / CV Panca Mas (Mas Parmin)',
      'Mas Parmin',
      '0812-xxxx-xxxx',
      'Bogor, Jawa Barat',
      'Bawang Merah Goreng (Brebes/Sumenep), Bawang Putih Kupas (1.5 ton/hari), Lada Murni, Fasilitas Sentrifugal De-oiling & QC Hub',
      true,
      'Pusat fasilitas sortasi, penggilingan, quality control, dan pengemasan di Bogor. Penggorengan di sentra mitra terstandarisasi.'
    )
    returning id into v_supplier_id;
  end if;

  -- 2. Insert or update Item: Bawang Merah Goreng
  alter table items add column if not exists image_url text;

  select id into v_item_id from items where name = 'Bawang Merah Goreng' limit 1;

  if v_item_id is null then
    insert into items (name, name_en, unit, hs_code, description, image_url, is_active)
    values (
      'Bawang Merah Goreng',
      'Crispy Fried Shallots',
      'kg',
      '2005.99.90',
      'Bawang merah goreng pilihan varietas asli Brebes & Sumenep mutu industri. Digoreng dengan minyak nabati sawit berkualitas tinggi dan ditiriskan secara maksimal melalui mesin sentrifugal (low free-oil / FFA < 0.5%, kadar air < 3.0%). Aroma harum gurih murni alami tanpa pengawet sintetis. Kemasan bal 5 kg dan zak industri bulk 20-25 kg.',
      '/products/fried-shallot-macro.jpg',
      true
    )
    returning id into v_item_id;
  else
    update items set
      name_en = 'Crispy Fried Shallots',
      unit = 'kg',
      hs_code = '2005.99.90',
      description = 'Bawang merah goreng pilihan varietas asli Brebes & Sumenep mutu industri. Digoreng dengan minyak nabati sawit berkualitas tinggi dan ditiriskan secara maksimal melalui mesin sentrifugal (low free-oil / FFA < 0.5%, kadar air < 3.0%). Aroma harum gurih murni alami tanpa pengawet sintetis. Kemasan bal 5 kg dan zak industri bulk 20-25 kg.',
      image_url = '/products/fried-shallot-macro.jpg',
      is_active = true
    where id = v_item_id;
  end if;

  -- 3. Insert or update Item Grades
  -- Grade A: Slice Renyah Keemasan (HORECA / Catering)
  insert into item_grades (item_id, grade_code, grade_description, is_active)
  values (
    v_item_id,
    'GRADE_A_SLICE',
    'Irisan Utuh Renyah Keemasan (Crispy Golden Flakes). Cocok untuk HORECA, katering massal, topping resto bakso/mie/nasi box. Kemasan bal 5 kg ganda PE dalam karton box 10-20 kg.',
    true
  )
  on conflict (item_id, grade_code) do update
  set grade_description = excluded.grade_description, is_active = true;

  -- Grade B: Coarse Ground / Giling Kasar (Industri Seasoning & Sambal)
  insert into item_grades (item_id, grade_code, grade_description, is_active)
  values (
    v_item_id,
    'GRADE_B_CRUSHED',
    'Giling Kasar / Coarse Ground. Khusus formulasi base bumbu, sambal botol/kemasan, pasta bumbu, dan savory seasoning industri. Kemasan karung bulk 20-25 kg inner PE food-grade.',
    true
  )
  on conflict (item_id, grade_code) do update
  set grade_description = excluded.grade_description, is_active = true;

  -- Grade C: Shallot Powder / Serbuk Bawang Goreng
  insert into item_grades (item_id, grade_code, grade_description, is_active)
  values (
    v_item_id,
    'GRADE_POWDER',
    'Serbuk Halus / Shallot Powder (Mesh 60-80). Untuk racikan premix kaldu, sup instan, bumbu kuah baso, dan seasoning bubuk gurih.',
    true
  )
  on conflict (item_id, grade_code) do update
  set grade_description = excluded.grade_description, is_active = true;

  -- 4. Seed 7 Days Price History (Sparkline data & Live Matrix)
  -- HPP Modal Beli Netto: Rp 125.000 / kg
  -- Tier 1 Selling Price (100-499 kg): Rp 165.000 / kg
  -- Tier 2 Selling Price (500-999 kg): Rp 155.000 / kg
  -- Tier 3 Selling Price (1-2 ton): Rp 149.000 / kg
  -- Tier 4 Selling Price (> 2 ton): Rp 144.000 / kg
  -- Floor Price: Rp 140.000 / kg

  for i in 0..7 loop
    v_d := v_today - i;
    
    -- Supplier HPP Price Entry
    insert into price_history (item_id, grade_code, price_per_unit, currency, price_date, source_type, supplier_id, notes)
    values (v_item_id, 'GRADE_A_SLICE', 125000.00, 'IDR', v_d, 'supplier', v_supplier_id, 'HPP Modal Beli Supplier Netto (Locco Gudang Bogor)')
    on conflict (item_id, grade_code, price_date, source_type) do update
    set price_per_unit = excluded.price_per_unit, notes = excluded.notes;

    -- Tier 1 Selling Price Entry
    insert into price_history (item_id, grade_code, price_per_unit, currency, price_date, source_type, supplier_id, notes)
    values (v_item_id, 'GRADE_A_SLICE', 165000.00, 'IDR', v_d, 'selling_tier_1', null, 'Tier 1 HORECA (100-499 kg Franco Jabodetabek/Bandung, Margin Rp 35k/kg)')
    on conflict (item_id, grade_code, price_date, source_type) do update
    set price_per_unit = excluded.price_per_unit, notes = excluded.notes;

    -- Tier 2 Selling Price Entry
    insert into price_history (item_id, grade_code, price_per_unit, currency, price_date, source_type, supplier_id, notes)
    values (v_item_id, 'GRADE_A_SLICE', 155000.00, 'IDR', v_d, 'selling_tier_2', null, 'Tier 2 Catering (500-999 kg Franco Jabodetabek/Bandung, Margin Rp 25k/kg)')
    on conflict (item_id, grade_code, price_date, source_type) do update
    set price_per_unit = excluded.price_per_unit, notes = excluded.notes;

    -- Coarse Ground Grade HPP
    insert into price_history (item_id, grade_code, price_per_unit, currency, price_date, source_type, supplier_id, notes)
    values (v_item_id, 'GRADE_B_CRUSHED', 125000.00, 'IDR', v_d, 'supplier', v_supplier_id, 'HPP Modal Beli Coarse Ground Supplier Netto')
    on conflict (item_id, grade_code, price_date, source_type) do update
    set price_per_unit = excluded.price_per_unit, notes = excluded.notes;

    -- Coarse Ground Grade Selling Tier 2
    insert into price_history (item_id, grade_code, price_per_unit, currency, price_date, source_type, supplier_id, notes)
    values (v_item_id, 'GRADE_B_CRUSHED', 150000.00, 'IDR', v_d, 'selling_tier_2', null, 'Coarse Ground Seasoning Industry Franco')
    on conflict (item_id, grade_code, price_date, source_type) do update
    set price_per_unit = excluded.price_per_unit, notes = excluded.notes;
  end loop;

end $$;
