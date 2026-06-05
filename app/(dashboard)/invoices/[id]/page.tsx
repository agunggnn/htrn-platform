import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'
import { InvoiceActions } from '@/components/invoices/InvoiceActions'

type Props = { params: Promise<{ id: string }> }

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  partial: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-600',
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: inv }, { data: lineItems }, { data: payments }, { data: company }, { data: bank }] = await Promise.all([
    supabase.from('invoices').select('*, buyers(*), signatories(*)').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase.from('payments').select('*').eq('invoice_id', id).order('payment_date', { ascending: false }),
    supabase.from('company_profile').select('*').limit(1).single(),
    supabase.from('bank_accounts').select('*').eq('is_primary', true).limit(1).single(),
  ])

  if (!inv) notFound()

  const buyer = inv.buyers as any
  const signatory = inv.signatories as any
  const isID = inv.language === 'id'
  const paymentList = payments ?? []
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency, minimumFractionDigits: 2 }).format(n)
  const paidPct = inv.total_amount > 0 ? ((inv.amount_paid ?? 0) / inv.total_amount) * 100 : 0

  return (
    <div className="px-8 py-8">
      <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{inv.inv_number ?? 'Draft'}</h1>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLE[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {inv.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/api/pdf/invoice/${id}`} target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <FileDown className="w-4 h-4" /> PDF
          </Link>
          <InvoiceActions invoiceId={id} status={inv.status} amountDue={inv.amount_due ?? 0} currency={inv.currency} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Invoice document */}
        <div className="col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            {/* Header */}
            <div className="flex items-start justify-between pb-6 border-b border-gray-100 mb-6">
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: '#1a472a' }}>
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <p className="font-bold text-gray-900">{(company as any)?.company_name ?? 'Haturan'}</p>
                {(company as any)?.address && <p className="text-xs text-gray-400">{(company as any).address}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: '#1a472a' }}>
                  {isID ? 'INVOICE' : 'COMMERCIAL INVOICE'}
                </p>
                <p className="text-sm text-gray-500 mt-1">No: {inv.inv_number}</p>
                <p className="text-xs text-gray-400">Date: {inv.issue_date}</p>
                <p className="text-xs text-gray-400">Due: {inv.due_date}</p>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Shipper / Exporter</p>
                <p className="font-semibold text-sm">{(company as any)?.company_name ?? 'Haturan'}</p>
                {(company as any)?.npwp && <p className="text-xs text-gray-500">NPWP: {(company as any).npwp}</p>}
              </div>
              {buyer && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Consignee / Buyer</p>
                  <p className="font-semibold text-sm">{buyer.company_name}</p>
                  {buyer.contact_name && <p className="text-xs text-gray-500">Attn: {buyer.contact_name}</p>}
                  {buyer.country && <p className="text-xs text-gray-500">{buyer.country}</p>}
                </div>
              )}
            </div>

            {/* Line items */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-left pb-2 text-xs font-semibold text-gray-700">Description</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-700">Grade</th>
                  <th className="text-left pb-2 text-xs font-semibold text-gray-700">HS Code</th>
                  <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-24">Qty (kg)</th>
                  <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-28">Unit Price</th>
                  <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(lineItems ?? []).map((l: any) => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="py-2.5">
                      <p className="font-medium">{l.description}</p>
                      <p className="text-xs text-gray-400">Country of Origin: {l.country_of_origin}</p>
                    </td>
                    <td className="py-2.5 text-gray-600">{l.grade_code}</td>
                    <td className="py-2.5 text-gray-500">{l.hs_code ?? '—'}</td>
                    <td className="py-2.5 text-right">{l.quantity}</td>
                    <td className="py-2.5 text-right">{fmt(l.unit_price)}</td>
                    <td className="py-2.5 text-right font-medium">{fmt(l.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-6">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(inv.subtotal ?? 0)}</span></div>
                {inv.tax_rate > 0 && <div className="flex justify-between text-gray-500"><span>Tax ({inv.tax_rate}%)</span><span>{fmt(inv.tax_amount ?? 0)}</span></div>}
                {inv.currency !== 'IDR' && inv.exchange_rate > 1 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Kurs IDR</span>
                    <span>Rp {new Intl.NumberFormat('id-ID').format(Math.round((inv.total_amount ?? 0) * inv.exchange_rate))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                  <span>TOTAL</span><span>{fmt(inv.total_amount ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Bank & Declaration */}
            {(bank as any)?.bank_name && (
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-400 mb-1">Payment Instructions</p>
                <p className="text-sm text-gray-700">
                  {(bank as any).bank_name} · {(bank as any).account_number} · {(bank as any).account_name}
                  {inv.currency !== 'IDR' && inv.exchange_rate > 1 && (
                    <span className="text-xs text-gray-400 ml-2">({inv.currency} 1 = IDR {new Intl.NumberFormat('id-ID').format(inv.exchange_rate)})</span>
                  )}
                </p>
              </div>
            )}

            {inv.payment_terms && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-400 mb-1">Payment Terms</p>
                <p className="text-sm">{inv.payment_terms}</p>
              </div>
            )}

            <p className="text-xs text-gray-400 italic mt-4">
              I hereby certify that the information in this invoice is true and correct.
            </p>

            {signatory && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                {signatory.signature_url && <img src={signatory.signature_url} alt="sig" className="h-10 mb-1" />}
                <p className="text-sm font-semibold">{signatory.name}</p>
                <p className="text-xs text-gray-400">{signatory.title}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment sidebar */}
        <div className="space-y-4">
          {/* Payment status */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Pembayaran</p>
            <p className="text-2xl font-bold text-red-600 mb-1">{fmt(inv.amount_due ?? 0)}</p>
            <p className="text-xs text-gray-400 mb-3">outstanding dari {fmt(inv.total_amount ?? 0)}</p>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
              <div className="h-2 rounded-full" style={{ width: `${Math.min(100, paidPct)}%`, backgroundColor: '#1a472a' }} />
            </div>
            <p className="text-xs text-gray-400">{paidPct.toFixed(0)}% dibayar ({fmt(inv.amount_paid ?? 0)})</p>
          </div>

          {/* Payment history */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Riwayat Pembayaran</p>
            {paymentList.length === 0 ? (
              <p className="text-xs text-gray-400">Belum ada pembayaran</p>
            ) : (
              <div className="space-y-2">
                {paymentList.map((p: any) => (
                  <div key={p.id} className="flex items-start justify-between text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{fmt(p.amount)}</p>
                      <p className="text-xs text-gray-400">{p.payment_date} · {p.method}</p>
                      {p.reference_number && <p className="text-xs text-gray-400">Ref: {p.reference_number}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
