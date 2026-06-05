-- Storage bucket untuk logo dan tanda tangan
insert into storage.buckets (id, name, public)
values ('company', 'company', true)
on conflict (id) do nothing;

-- Policy: authenticated user bisa upload dan read
create policy "Auth users can upload company files"
on storage.objects for insert
to authenticated
with check (bucket_id = 'company');

create policy "Public can read company files"
on storage.objects for select
to public
using (bucket_id = 'company');

create policy "Auth users can update company files"
on storage.objects for update
to authenticated
using (bucket_id = 'company');

-- RLS policies untuk semua tabel
alter table items enable row level security;
alter table item_grades enable row level security;
alter table price_history enable row level security;
alter table suppliers enable row level security;
alter table company_profile enable row level security;
alter table bank_accounts enable row level security;
alter table signatories enable row level security;
alter table buyers enable row level security;
alter table quotations enable row level security;
alter table quotation_items enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table purchase_orders enable row level security;
alter table po_items enable row level security;

-- Semua tabel: authenticated user bisa CRUD
do $$
declare
  t text;
begin
  foreach t in array array[
    'items','item_grades','price_history','suppliers',
    'company_profile','bank_accounts','signatories',
    'buyers','quotations','quotation_items',
    'invoices','invoice_items','payments',
    'purchase_orders','po_items'
  ]
  loop
    execute format('
      create policy "Authenticated full access on %I"
      on %I for all to authenticated
      using (true) with check (true);
    ', t, t);
  end loop;
end $$;
