import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { InvoicesTableView, type InvoiceWithBuyer } from '@/components/invoices/InvoicesTableView'

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, buyers(company_name, country)')
    .order('created_at', { ascending: false })

  const list = (invoices as unknown as InvoiceWithBuyer[]) ?? []

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commercial Invoice (Faktur Penjualan)</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Penagihan komoditas B2B, jadwal pelunasan CBD, dan status piutang
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/invoices/aging"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
          >
            Aging Report
          </Link>
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity"
            style={{ backgroundColor: '#1a472a' }}
          >
            <Plus className="h-4 w-4" /> Invoice Baru
          </Link>
        </div>
      </div>

      <InvoicesTableView initialInvoices={list} />
    </div>
  )
}
