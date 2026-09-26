-- Migration: Security & Compliance Hardening (TASK-25)
-- 1. Private Storage & Revoke Public Access for Claim Documents
-- 2. Sharing Gating: Document cannot be active unless verified
-- 3. Server/Database Floor Price Enforcement on Quotations (Rp 140.000/kg)

-- 1. Set claim-documents storage bucket to private
update storage.buckets
set public = false
where id = 'claim-documents';

-- Drop public read policy from storage.objects
drop policy if exists "Public can read claim docs" on storage.objects;

-- Ensure authenticated users can read and manage storage objects in claim-documents
create policy "Authenticated read claim docs"
on storage.objects for select
to authenticated
using (bucket_id = 'claim-documents');

-- 2. Enforce sharing gating on claim_documents:
-- Ensure existing unverified documents are set to is_active = false
update claim_documents
set is_active = false
where is_verified = false;

-- Add database constraint: is_active can only be true if is_verified is true
alter table claim_documents
drop constraint if exists chk_claim_doc_verified_before_active;

alter table claim_documents
add constraint chk_claim_doc_verified_before_active
check (is_active = false or is_verified = true);

-- 3. Quotation Floor Price Constraint via PostgreSQL Trigger
-- Protects database from direct client injection of unit_price below Rp 140.000 for Bawang Merah Goreng IDR quotations
create or replace function check_quotation_floor_price()
returns trigger as $$
declare
  v_currency text;
  v_item_name text;
begin
  -- Get quotation currency
  select currency into v_currency
  from quotations
  where id = NEW.quotation_id;

  -- Only enforce for IDR transactions
  if v_currency = 'IDR' and NEW.unit_price is not null then
    -- Check if item is Bawang Merah Goreng
    if NEW.item_id is not null then
      select name into v_item_name
      from items
      where id = NEW.item_id;

      if v_item_name is not null and v_item_name ilike '%bawang%goreng%' then
        if NEW.unit_price < 140000 then
          raise exception 'Pelanggaran batas aman modal: unit_price Rp % di bawah Floor Price resmi (Rp 140.000/kg) untuk %.',
            NEW.unit_price, v_item_name;
        end if;
      end if;
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_check_quotation_floor_price on quotation_items;

create trigger trg_check_quotation_floor_price
before insert or update on quotation_items
for each row
execute function check_quotation_floor_price();
