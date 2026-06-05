import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { POStatusFlow } from '@/components/purchase-orders/POStatusFlow'

type Props = { params: Promise<{ id: string }> }

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-yellow-50 text-yellow-700',
  received: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-500',
}

const STATUS_STEPS = ['draft', 'sent', 'confirmed', 'received']

export default async function PODetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: po }, { data: poItems }] = await Promise.all([
    supabase.from('purchase_orders')
      .select('*, suppliers(*), quotations(quo_number, buyers(company_name))')
      .eq('id', id).single(),
    supabase.from('po_items')
      .select('*, items(name, name_en)')
      .eq('po_id', id)
      .order('id'),
  ])

  if (!po) notFound()

  const supplier = po.suppliers as any
  const quotation = po.quotations as any
  const items = poItems ?? []
  const fmt = (n: number) => `Rp ${new Intl.NumberFormat('id-ID').format(n)}`
  const currentStep = STATUS_STEPS.indexOf(po.status)

  return (
    <div className="px-8 py-8">
      <Link href="/purchase-orders" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{po.po_number ?? 'Draft PO'}</h1>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[po.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {po.status}
          </span>
        </div>
        <POStatusFlow
          poId={id}
          status={po.status}
          items={items.map((i: any) => ({
            id: i.id,
            grade_code: i.grade_code,
            quantity_ordered: i.quantity_ordered,
            unit: i.unit,
          }))}
        />
      </div>

      {/* Progress stepper */}
      {po.status !== 'cancelled' && (
        <div className="flex items-center gap-0 mb-6">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 flex-shrink-0 ${
                i < currentStep ? 'border-green-600 bg-green-600 text-white'
                : i === currentStep ? 'border-green-600 bg-white text-green-700'
                : 'border-gray-200 bg-white text-gray-400'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span className={`ml-1.5 text-xs font-medium capitalize ${i <= currentStep ? 'text-gray-700' : 'text-gray-300'}`}>
                {step}
              </span>
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${i < currentStep ? 'bg-green-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* PO document */}
        <div className="col-span-2 space-y-5">
          {/* Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 grid grid-cols-2 gap-4 text-sm">
            {[
              ['Supplier', supplier?.name ?? '—'],
              ['Wilayah', supplier?.region ?? '—'],
              ['Kontak', supplier?.contact_name ?? '—'],
              ['Telepon', supplier?.phone ?? '—'],
              ['QUO Terkait', quotation?.quo_number ?? '—'],
              ['Buyer', quotation?.buyers?.company_name ?? '—'],
              ['Tanggal Order', po.order_date ?? '—'],
              ['Expected Delivery', po.expected_date ?? '—'],
              ['Tanggal Diterima', po.received_date ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Item</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Rempah</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Grade</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Dipesan (kg)</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Diterima (kg)</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Harga Beli</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium">{item.items?.name ?? '—'}</p>
                      {item.items?.name_en && <p className="text-xs text-gray-400">{item.items.name_en}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                        {item.grade_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity_ordered} {item.unit}</td>
                    <td className={`px-4 py-3 text-right ${item.quantity_received < item.quantity_ordered ? 'text-orange-600' : 'text-green-600'}`}>
                      {item.quantity_received > 0 ? `${item.quantity_received} ${item.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {item.unit_price > 0 ? fmt(item.unit_price) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {item.subtotal > 0 ? fmt(item.subtotal) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {po.total_amount > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
                <p className="text-sm font-bold text-gray-900">Total: {fmt(po.total_amount)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {po.notes && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Catatan</p>
              <p className="text-sm text-gray-700">{po.notes}</p>
            </div>
          )}

          {supplier && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Supplier</p>
              <p className="text-sm font-semibold text-gray-900">{supplier.name}</p>
              {supplier.region && <p className="text-xs text-gray-500 mt-0.5">{supplier.region}</p>}
              {supplier.phone && <p className="text-xs text-gray-500">{supplier.phone}</p>}
              {supplier.specialties && (
                <p className="text-xs text-gray-400 mt-2">{supplier.specialties}</p>
              )}
            </div>
          )}

          {quotation && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">QUO Terkait</p>
              <Link href={`/quotations/${po.quotation_id}`}
                className="text-sm font-semibold text-green-700 hover:underline">
                {quotation.quo_number} →
              </Link>
              {quotation.buyers?.company_name && (
                <p className="text-xs text-gray-500 mt-0.5">{quotation.buyers.company_name}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
