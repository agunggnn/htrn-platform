import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { QuotationsTableView, type QuotationRow } from '@/components/quotations/QuotationsTableView'

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data: quotations } = await supabase
    .from('quotations')
    .select('*, buyers(company_name, country)')
    .order('created_at', { ascending: false })

  const list = (quotations as unknown as QuotationRow[]) ?? []

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotation (Surat Penawaran Harga)</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Katalog penawaran resmi B2B PT Haturan Spice Indonesia
          </p>
        </div>
        <Link
          href="/quotations/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity"
          style={{ backgroundColor: '#1a472a' }}
        >
          <Plus className="h-4 w-4" /> Quotation Baru
        </Link>
      </div>

      <QuotationsTableView initialQuotations={list} />
    </div>
  )
}
