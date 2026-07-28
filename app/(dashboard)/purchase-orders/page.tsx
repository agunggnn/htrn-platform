import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { PurchaseOrder } from '@/types'

type PurchaseOrderRow = PurchaseOrder & {
  suppliers: { name: string } | null
  quotations: { quo_number: string | null } | null
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-yellow-50 text-yellow-700',
  received: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-500',
}

export default async function PurchaseOrdersPage() {
  const supabase = await createClient()
  const { data: pos } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name), quotations(quo_number)')
    .order('created_at', { ascending: false })

  const list = (pos as unknown as PurchaseOrderRow[]) ?? []
  const fmt = (n: number) => `Rp ${new Intl.NumberFormat('id-ID').format(n)}`

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Order</h1>
          <p className="mt-0.5 text-sm text-gray-500">{list.length} PO</p>
        </div>
        <Link
          href="/purchase-orders/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: '#1a472a' }}
        >
          <Plus className="h-4 w-4" /> PO Baru
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {!list.length ? (
          <p className="py-12 text-center text-sm text-gray-400">Belum ada purchase order</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">No. PO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  Supplier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  QUO Terkait
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  Tgl Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                  Expected
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((po) => (
                <tr key={po.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{po.po_number ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{po.suppliers?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{po.quotations?.quo_number ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{po.order_date}</td>
                  <td className="px-4 py-3 text-gray-500">{po.expected_date ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {po.total_amount ? fmt(po.total_amount) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[po.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/purchase-orders/${po.id}`}
                      className="text-xs text-green-700 hover:underline"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
