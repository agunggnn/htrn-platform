import { createClient } from '@/lib/supabase/server'
import { InvoiceForm, type InvoicePrefill } from '@/components/invoices/InvoiceForm'

type Props = { searchParams: Promise<{ from?: string }> }

export default async function NewInvoicePage({ searchParams }: Props) {
  const { from } = await searchParams
  const supabase = await createClient()

  const [{ data: buyers }, { data: signatories }] = await Promise.all([
    supabase.from('buyers').select('*').eq('is_active', true).order('company_name'),
    supabase.from('signatories').select('*'),
  ])

  // Pre-fill from accepted quotation
  let prefill: InvoicePrefill | null = null
  if (from) {
    const { data: quo } = await supabase
      .from('quotations')
      .select('*, quotation_items(*, items(name, name_en, hs_code))')
      .eq('id', from)
      .single()
    if (quo) prefill = quo as unknown as InvoicePrefill
  }

  return (
    <div className="max-w-3xl px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Baru</h1>
        {prefill && (
          <p className="mt-0.5 text-sm text-gray-500">Dari quotation {prefill.quo_number}</p>
        )}
      </div>
      <InvoiceForm buyers={buyers ?? []} signatories={signatories ?? []} prefill={prefill} />
    </div>
  )
}
