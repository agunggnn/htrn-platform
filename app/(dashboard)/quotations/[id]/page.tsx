import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, FileDown } from 'lucide-react'
import { QuotationStatusAction } from '@/components/quotations/QuotationStatusAction'
import type { Buyer, QuotationItemWithItem, Signatory } from '@/types'

type Props = { params: Promise<{ id: string }> }

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  expired: 'bg-orange-50 text-orange-600',
}

export default async function QuotationDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: quo }, { data: lineItems }] = await Promise.all([
    supabase.from('quotations').select('*, buyers(*), signatories(*)').eq('id', id).single(),
    supabase
      .from('quotation_items')
      .select('*, items(name, name_en)')
      .eq('quotation_id', id)
      .order('sort_order'),
  ])

  if (!quo) notFound()

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quo.currency,
      maximumFractionDigits: 2,
    }).format(n)

  const T =
    quo.language === 'id'
      ? {
          title: 'PENAWARAN HARGA',
          desc: 'Deskripsi',
          qty: 'Jumlah',
          price: 'Harga Satuan',
          sub: 'Subtotal',
        }
      : {
          title: 'QUOTATION',
          desc: 'Description',
          qty: 'Qty',
          price: 'Unit Price',
          sub: 'Subtotal',
        }

  const buyer = quo.buyers as unknown as Buyer | null
  const signatory = quo.signatories as unknown as Signatory | null
  const items = (lineItems as unknown as QuotationItemWithItem[]) ?? []

  return (
    <div className="px-8 py-8">
      <Link
        href="/quotations"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      {/* Action bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{quo.quo_number ?? 'Draft'}</h1>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[quo.status] ?? 'bg-gray-100 text-gray-600'}`}
          >
            {quo.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/pdf/quotation/${id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <FileDown className="h-4 w-4" /> PDF
          </Link>
          <QuotationStatusAction id={id} status={quo.status} />
        </div>
      </div>

      {/* Document */}
      <div className="max-w-3xl rounded-2xl border border-gray-200 bg-white p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between border-b border-gray-100 pb-6">
          <div>
            <div
              className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: '#1a472a' }}
            >
              <span className="text-sm font-bold text-white">H</span>
            </div>
            <p className="font-bold text-gray-900">Haturan</p>
            <p className="text-xs text-gray-400">Spice Export</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: '#1a472a' }}>
              {T.title}
            </p>
            <p className="mt-1 text-sm text-gray-500">No: {quo.quo_number}</p>
            <p className="text-xs text-gray-400">Date: {quo.date}</p>
            <p className="text-xs text-gray-400">Valid until: {quo.valid_until}</p>
          </div>
        </div>

        {/* Buyer */}
        {buyer && (
          <div className="mb-6">
            <p className="mb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">
              {quo.language === 'id' ? 'Kepada' : 'To'}
            </p>
            <p className="font-semibold text-gray-900">{buyer.company_name}</p>
            {buyer.contact_name && (
              <p className="text-sm text-gray-600">Attn: {buyer.contact_name}</p>
            )}
            {buyer.country && <p className="text-sm text-gray-500">{buyer.country}</p>}
            {buyer.email && <p className="text-sm text-gray-500">{buyer.email}</p>}
          </div>
        )}

        {/* Line items */}
        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="pb-2 text-left text-xs font-semibold text-gray-700">{T.desc}</th>
              <th className="pb-2 text-left text-xs font-semibold text-gray-700">Grade</th>
              <th className="w-24 pb-2 text-right text-xs font-semibold text-gray-700">{T.qty}</th>
              <th className="w-28 pb-2 text-right text-xs font-semibold text-gray-700">
                {T.price}
              </th>
              <th className="w-28 pb-2 text-right text-xs font-semibold text-gray-700">{T.sub}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((line) => (
              <tr key={line.id} className="border-b border-gray-50">
                <td className="py-2.5">
                  <p className="font-medium text-gray-900">
                    {quo.language === 'id'
                      ? line.items?.name
                      : (line.items?.name_en ?? line.items?.name)}
                  </p>
                  {line.hs_code && (
                    <p className="text-xs text-gray-400">
                      HS: {line.hs_code} · {line.country_of_origin}
                    </p>
                  )}
                </td>
                <td className="py-2.5 text-gray-600">{line.grade_code}</td>
                <td className="py-2.5 text-right text-gray-700">
                  {line.quantity} {line.unit}
                </td>
                <td className="py-2.5 text-right text-gray-700">{fmt(line.unit_price ?? 0)}</td>
                <td className="py-2.5 text-right font-medium text-gray-900">
                  {fmt(line.subtotal ?? 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mb-6 flex justify-end">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{fmt(quo.subtotal ?? 0)}</span>
            </div>
            {quo.tax_rate > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Tax ({quo.tax_rate}%)</span>
                <span>{fmt(quo.tax_amount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold text-gray-900">
              <span>{quo.language === 'id' ? 'Total' : 'Total'}</span>
              <span>{fmt(quo.total_amount ?? 0)}</span>
            </div>
          </div>
        </div>

        {quo.payment_terms && (
          <div className="mb-4 border-b border-gray-100 pb-4">
            <p className="mb-1 text-xs font-medium text-gray-400">Payment Terms</p>
            <p className="text-sm text-gray-700">{quo.payment_terms}</p>
          </div>
        )}

        {quo.notes && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-gray-400">Notes</p>
            <p className="text-sm text-gray-700">{quo.notes}</p>
          </div>
        )}

        {signatory && (
          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="mb-1 text-xs text-gray-400">Authorized by</p>
            {signatory.signature_url && (
              <Image
                src={signatory.signature_url}
                alt={`Tanda tangan ${signatory.name}`}
                width={160}
                height={48}
                unoptimized
                className="mb-1 h-12 w-auto object-contain"
              />
            )}
            <p className="text-sm font-semibold text-gray-900">{signatory.name}</p>
            <p className="text-xs text-gray-400">{signatory.title}</p>
          </div>
        )}
      </div>
    </div>
  )
}
