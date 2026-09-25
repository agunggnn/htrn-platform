import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PackingListForm } from '@/components/shipping/PackingListForm'
import type { InvoiceItem, PackingList, PackingListItem } from '@/types'

type Props = { params: Promise<{ id: string }> }

export default async function InvoicePackingListPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: inv }, { data: invItems }, { data: pl }] = await Promise.all([
    supabase.from('invoices').select('id, inv_number').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase.from('packing_lists').select('*').eq('invoice_id', id).maybeSingle(),
  ])

  if (!inv) notFound()

  let plItems: PackingListItem[] = []
  if (pl) {
    const { data: items } = await supabase
      .from('packing_list_items')
      .select('*')
      .eq('packing_list_id', pl.id)
      .order('sort_order')
    plItems = (items as unknown as PackingListItem[]) ?? []
  }

  return (
    <div className="px-6 py-8 lg:px-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Packing List & Dokumen Ekspor
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Kelola rincian kemasan, tonase berat bersih/kotor, dan kontainer untuk Invoice {inv.inv_number ?? 'Draft'}
        </p>
      </div>

      <PackingListForm
        invoiceId={inv.id}
        invNumber={inv.inv_number}
        existingPL={pl as unknown as PackingList}
        existingItems={plItems}
        invoiceItems={(invItems as unknown as InvoiceItem[]) ?? []}
      />
    </div>
  )
}
