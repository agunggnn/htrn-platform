import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { POStatusFlow } from '@/components/purchase-orders/POStatusFlow'
import type { Supplier, Quotation, Buyer, POItemWithItem } from '@/types'

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
    supabase
      .from('purchase_orders')
      .select('*, suppliers(*), quotations(quo_number, buyers(company_name))')
      .eq('id', id)
      .single(),
    supabase.from('po_items').select('*, items(name, name_en)').eq('po_id', id).order('id'),
  ])

  if (!po) notFound()

  const supplier = po.suppliers as unknown as Supplier
  const quotation = po.quotations as unknown as Quotation & {
    buyers: Pick<Buyer, 'company_name'> | null
  }
  const items = (poItems as unknown as POItemWithItem[]) ?? []
  const fmt = (n: number) => `Rp ${new Intl.NumberFormat('id-ID').format(n)}`
  const currentStep = STATUS_STEPS.indexOf(po.status)

  return (
    <div className="px-8 py-8">
      <Link
        href="/purchase-orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{po.po_number ?? 'Draft PO'}</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[po.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {po.status}
          </span>
        </div>
        <POStatusFlow
          poId={id}
          status={po.status}
          items={items.map((i) => ({
            id: i.id,
            grade_code: i.grade_code ?? '',
            quantity_ordered: i.quantity_ordered ?? 0,
            unit: i.unit ?? 'kg',
          }))}
        />
      </div>

      {/* Progress stepper */}
      {po.status !== 'cancelled' && (
        <div className="mb-6 flex items-center gap-0">
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex flex-1 items-center">
              <div
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  i < currentStep
                    ? 'border-green-600 bg-green-600 text-white'
                    : i === currentStep
                      ? 'border-green-600 bg-white text-green-700'
                      : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {i < currentStep ? '✓' : i + 1}
              </div>
              <span
                className={`ml-1.5 text-xs font-medium capitalize ${i <= currentStep ? 'text-gray-700' : 'text-gray-300'}`}
              >
                {step}
              </span>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`mx-3 h-0.5 flex-1 ${i < currentStep ? 'bg-green-600' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* PO document */}
        <div className="col-span-2 space-y-5">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-gray-200 bg-white p-6 text-sm">
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
                <p className="mb-0.5 text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Items table */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-700">Item</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">
                    Rempah
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                    Grade
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">
                    Dipesan (kg)
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">
                    Diterima (kg)
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">
                    Harga Beli
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium">{item.items?.name ?? '—'}</p>
                      {item.items?.name_en && (
                        <p className="text-xs text-gray-400">{item.items.name_en}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        {item.grade_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.quantity_ordered ?? 0} {item.unit}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${(item.quantity_received ?? 0) < (item.quantity_ordered ?? 0) ? 'text-orange-600' : 'text-green-600'}`}
                    >
                      {(item.quantity_received ?? 0) > 0
                        ? `${item.quantity_received} ${item.unit}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {(item.unit_price ?? 0) > 0 ? fmt(item.unit_price ?? 0) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {(item.subtotal ?? 0) > 0 ? fmt(item.subtotal ?? 0) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {po.total_amount > 0 && (
              <div className="flex justify-end border-t border-gray-100 px-5 py-4">
                <p className="text-sm font-bold text-gray-900">Total: {fmt(po.total_amount)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {po.notes && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                Catatan
              </p>
              <p className="text-sm text-gray-700">{po.notes}</p>
            </div>
          )}

          {supplier && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
                Supplier
              </p>
              <p className="text-sm font-semibold text-gray-900">{supplier.name}</p>
              {supplier.region && <p className="mt-0.5 text-xs text-gray-500">{supplier.region}</p>}
              {supplier.phone && <p className="text-xs text-gray-500">{supplier.phone}</p>}
              {supplier.specialties && (
                <p className="mt-2 text-xs text-gray-400">{supplier.specialties}</p>
              )}
            </div>
          )}

          {quotation && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="mb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
                QUO Terkait
              </p>
              <Link
                href={`/quotations/${po.quotation_id}`}
                className="text-sm font-semibold text-green-700 hover:underline"
              >
                {quotation.quo_number} →
              </Link>
              {quotation.buyers?.company_name && (
                <p className="mt-0.5 text-xs text-gray-500">{quotation.buyers.company_name}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
