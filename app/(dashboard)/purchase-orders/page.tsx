import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import {
  PurchaseOrdersTableView,
  type PurchaseOrderRow,
} from '@/components/purchase-orders/PurchaseOrdersTableView'

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()
  const { data: pos } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name), quotations(quo_number)')
    .order('created_at', { ascending: false })

  const list = (pos as unknown as PurchaseOrderRow[]) ?? []

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order (Pesanan Maklon)</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Perintah produksi, sortasi, dan pengemasan ke Mas Parmin (CV Daun Mas Hub Bogor)
          </p>
        </div>
        <Link
          href="/purchase-orders/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-2xs hover:opacity-95 transition-opacity"
          style={{ backgroundColor: '#1a472a' }}
        >
          <Plus className="h-4 w-4" /> PO Baru
        </Link>
      </div>

      <PurchaseOrdersTableView initialPurchaseOrders={list} />
    </div>
  )
}
