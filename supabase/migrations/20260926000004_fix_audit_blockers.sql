-- Migration: Security & Compliance Audit Hardening (TASK-25 Part 2)
-- 1. Restrict RLS on claim_documents: authenticated users cannot directly set is_verified = true
-- 2. Trigger defense-in-depth: block direct client verification bypass

-- Drop old broad policy if exists
drop policy if exists "Authenticated full access on claim_documents" on claim_documents;
drop policy if exists "Authenticated read claim_documents" on claim_documents;
drop policy if exists "Authenticated insert claim_documents" on claim_documents;
drop policy if exists "Authenticated update claim_documents" on claim_documents;
drop policy if exists "Authenticated delete claim_documents" on claim_documents;

-- 1. Granular RLS Policies for authenticated users
-- Read access
create policy "Authenticated read claim_documents"
  on claim_documents for select to authenticated
  using (true);

-- Insert access: CANNOT be inserted with is_verified = true
create policy "Authenticated insert claim_documents"
  on claim_documents for insert to authenticated
  with check (is_verified = false);

-- Update access: cannot turn is_verified into true via direct client
create policy "Authenticated update claim_documents"
  on claim_documents for update to authenticated
  using (true)
  with check (
    is_verified = false or 
    (is_verified = true and is_verified = (select c.is_verified from claim_documents c where c.id = claim_documents.id))
  );

-- Delete access
create policy "Authenticated delete claim_documents"
  on claim_documents for delete to authenticated
  using (true);

-- 2. Trigger defense-in-depth
-- Ensures that even if RLS is bypassed or misconfigured, any attempt from a direct authenticated client
-- to set is_verified = true is strictly aborted at the PostgreSQL transaction level.
create or replace function trg_guard_claim_documents_verification()
returns trigger as $$
declare
  v_role text;
begin
  -- If is_verified is being set to true (either on INSERT or UPDATE from false/null)
  if NEW.is_verified = true and (TG_OP = 'INSERT' or OLD.is_verified is distinct from true) then
    -- Check JWT claim role or current database user
    v_role := nullif(current_setting('request.jwt.claim.role', true), '');
    
    if current_user = 'authenticated' or v_role = 'authenticated' or v_role = 'anon' then
      raise exception 'Direct client verification is forbidden. Verification requires Director PIN authorization via /api/claim-documents/verify.'
        using errcode = 'P0001';
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_check_claim_documents_verification on claim_documents;

create trigger trg_check_claim_documents_verification
before insert or update on claim_documents
for each row
execute function trg_guard_claim_documents_verification();
