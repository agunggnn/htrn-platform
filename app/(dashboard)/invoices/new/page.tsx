import { createClient } from '@/lib/supabase/server'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'

type Props = { searchParams: Promise<{ from?: string }> }

export default async function NewInvoicePage({ searchParams }: Props) {
  const { from } = await searchParams
  const supabase = await createClient()

  const [{ data: buyers }, { data: signatories }] = await Promise.all([
    supabase.from('buyers').select('*').eq('is_active', true).order('company_name'),
    supabase.from('signatories').select('*'),
  ])

  // Pre-fill from accepted quotation
  let prefill: any = null
  if (from) {
    const { data: quo } = await supabase
      .from('quotations')
      .select('*, quotation_items(*, items(name, name_en, hs_code))')
      .eq('id', from)
      .single()
    if (quo) prefill = quo
  }

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoice Baru</h1>
        {prefill && (
          <p className="text-sm text-gray-500 mt-0.5">Dari quotation {prefill.quo_number}</p>
        )}
      </div>
      <InvoiceForm
        buyers={buyers ?? []}
        signatories={signatories ?? []}
        prefill={prefill}
      />
    </div>
  )
}
