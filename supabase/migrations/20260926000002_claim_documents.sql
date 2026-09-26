-- Claim Documents: manage toggle on/off, verification status, and supporting files
-- for product claim documents (halal declaration, spec sheet, COA, etc.)

create table if not exists claim_documents (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references items(id) on delete cascade,
  doc_type text not null check (doc_type in ('halal_declaration', 'spec_sheet', 'coa', 'custom')),
  title text not null,
  description text,
  
  -- Toggle: on/off for sharing
  is_active boolean not null default false,
  
  -- Verification with supplier
  is_verified boolean not null default false,
  verified_at timestamptz,
  verified_by text,
  supplier_id uuid references suppliers(id) on delete set null,
  
  -- Supporting document file (scan from supplier)
  supporting_file_url text,
  supporting_file_name text,
  
  -- Route path for generated document (null for uploaded-only docs like COA)
  generated_route text,
  
  notes text,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table claim_documents enable row level security;

-- Authenticated full access
create policy "Authenticated full access on claim_documents"
  on claim_documents for all to authenticated
  using (true) with check (true);

-- Public read for active documents (needed for PDF routes)
create policy "Public read active claim_documents"
  on claim_documents for select to anon
  using (is_active = true);

-- Storage bucket for claim documents and verification scans
insert into storage.buckets (id, name, public)
values ('claim-documents', 'claim-documents', true)
on conflict (id) do nothing;

create policy "Auth users can upload claim docs"
on storage.objects for insert
to authenticated
with check (bucket_id = 'claim-documents');

create policy "Public can read claim docs"
on storage.objects for select
to public
using (bucket_id = 'claim-documents');

create policy "Auth users can update claim docs"
on storage.objects for update
to authenticated
using (bucket_id = 'claim-documents');

-- Seed initial claim documents for Bawang Merah Goreng
-- (item_id will be looked up dynamically)
do $$
declare
  v_item_id uuid;
  v_supplier_id uuid;
begin
  select id into v_item_id from items where name ilike '%bawang%goreng%' limit 1;
  select id into v_supplier_id from suppliers where name ilike '%daun mas%' or name ilike '%panca mas%' or name ilike '%parmin%' limit 1;
  
  if v_item_id is not null then
    -- Halal Declaration
    insert into claim_documents (item_id, doc_type, title, description, is_active, is_verified, supplier_id, generated_route, notes)
    values (
      v_item_id,
      'halal_declaration',
      'Surat Jaminan Halal & Keamanan Pangan',
      'Surat pernyataan jaminan kehalalan bahan, proses pengolahan, dan kemasan produk Bawang Merah Goreng.',
      true,
      false,
      v_supplier_id,
      '/api/pdf/halal-declaration/bawang-goreng',
      'Perlu verifikasi klaim dengan CV Daun Mas: merek minyak goreng, fasilitas produksi, proses QC.'
    )
    on conflict do nothing;
    
    -- Spec Sheet / TDS
    insert into claim_documents (item_id, doc_type, title, description, is_active, is_verified, supplier_id, generated_route, notes)
    values (
      v_item_id,
      'spec_sheet',
      'Technical Data Sheet (TDS) / Spec Sheet',
      'Lembar data teknis spesifikasi mutu fisik-kimia, varian grade, kemasan, dan harga franco.',
      true,
      false,
      v_supplier_id,
      '/api/pdf/spec-sheet/bawang-goreng',
      'Spesifikasi moisture < 3%, FFA < 0.5% perlu diverifikasi dengan hasil CoA aktual.'
    )
    on conflict do nothing;
    
    -- COA (uploaded from supplier, no generated route)
    insert into claim_documents (item_id, doc_type, title, description, is_active, is_verified, supplier_id, generated_route, notes)
    values (
      v_item_id,
      'coa',
      'Certificate of Analysis (CoA) / Laporan Hasil Uji',
      'Laporan hasil uji laboratorium independen untuk parameter mutu produk.',
      false,
      false,
      v_supplier_id,
      null,
      'CoA dari CV Daun Mas sudah ada fisiknya. Perlu di-scan dan upload.'
    )
    on conflict do nothing;
  end if;
end $$;
