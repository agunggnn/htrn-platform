import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileDown, CheckCircle, XCircle } from 'lucide-react'
import { QuotationStatusAction } from '@/components/quotations/QuotationStatusAction'

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
    supabase.from('quotation_items').select('*, items(name, name_en)').eq('quotation_id', id).order('sort_order'),
  ])

  if (!quo) notFound()

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: quo.currency, maximumFractionDigits: 2 }).format(n)

  const T = quo.language === 'id'
    ? { title: 'PENAWARAN HARGA', desc: 'Deskripsi', qty: 'Jumlah', price: 'Harga Satuan', sub: 'Subtotal' }
    : { title: 'QUOTATION', desc: 'Description', qty: 'Qty', price: 'Unit Price', sub: 'Subtotal' }

  const buyer = quo.buyers as any
  const signatory = quo.signatories as any

  return (
    <div className="px-8 py-8">
      <Link href="/quotations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>

      {/* Action bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{quo.quo_number ?? 'Draft'}</h1>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[quo.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {quo.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/api/pdf/quotation/${id}`} target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <FileDown className="w-4 h-4" /> PDF
          </Link>
          <QuotationStatusAction id={id} status={quo.status} />
        </div>
      </div>

      {/* Document */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-gray-100 mb-6">
          <div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: '#1a472a' }}>
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <p className="font-bold text-gray-900">Haturan</p>
            <p className="text-xs text-gray-400">Spice Export</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: '#1a472a' }}>{T.title}</p>
            <p className="text-sm text-gray-500 mt-1">No: {quo.quo_number}</p>
            <p className="text-xs text-gray-400">Date: {quo.date}</p>
            <p className="text-xs text-gray-400">Valid until: {quo.valid_until}</p>
          </div>
        </div>

        {/* Buyer */}
        {buyer && (
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              {quo.language === 'id' ? 'Kepada' : 'To'}
            </p>
            <p className="font-semibold text-gray-900">{buyer.company_name}</p>
            {buyer.contact_name && <p className="text-sm text-gray-600">Attn: {buyer.contact_name}</p>}
            {buyer.country && <p className="text-sm text-gray-500">{buyer.country}</p>}
            {buyer.email && <p className="text-sm text-gray-500">{buyer.email}</p>}
          </div>
        )}

        {/* Line items */}
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left pb-2 text-xs font-semibold text-gray-700">{T.desc}</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-700">Grade</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-24">{T.qty}</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-28">{T.price}</th>
              <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-28">{T.sub}</th>
            </tr>
          </thead>
          <tbody>
            {(lineItems ?? []).map((line: any) => (
              <tr key={line.id} className="border-b border-gray-50">
                <td className="py-2.5">
                  <p className="font-medium text-gray-900">
                    {quo.language === 'id' ? line.items?.name : (line.items?.name_en ?? line.items?.name)}
                  </p>
                  {line.hs_code && <p className="text-xs text-gray-400">HS: {line.hs_code} · {line.country_of_origin}</p>}
                </td>
                <td className="py-2.5 text-gray-600">{line.grade_code}</td>
                <td className="py-2.5 text-right text-gray-700">{line.quantity} {line.unit}</td>
                <td className="py-2.5 text-right text-gray-700">{fmt(line.unit_price)}</td>
                <td className="py-2.5 text-right font-medium text-gray-900">{fmt(line.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{fmt(quo.subtotal ?? 0)}</span>
            </div>
            {quo.tax_rate > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Tax ({quo.tax_rate}%)</span><span>{fmt(quo.tax_amount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
              <span>{quo.language === 'id' ? 'Total' : 'Total'}</span>
              <span>{fmt(quo.total_amount ?? 0)}</span>
            </div>
          </div>
        </div>

        {quo.payment_terms && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-400 mb-1">Payment Terms</p>
            <p className="text-sm text-gray-700">{quo.payment_terms}</p>
          </div>
        )}

        {quo.notes && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 mb-1">Notes</p>
            <p className="text-sm text-gray-700">{quo.notes}</p>
          </div>
        )}

        {signatory && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Authorized by</p>
            {signatory.signature_url && (
              <img src={signatory.signature_url} alt="signature" className="h-12 mb-1" />
            )}
            <p className="text-sm font-semibold text-gray-900">{signatory.name}</p>
            <p className="text-xs text-gray-400">{signatory.title}</p>
          </div>
        )}
      </div>
    </div>
  )
}
