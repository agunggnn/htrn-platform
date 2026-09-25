import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

type MarginDeal = {
  quotationId: string
  quoNumber: string | null
  invNumber: string | null
  poNumber: string | null
  buyerName: string
  supplierName: string
  issueDate: string
  currency: string
  revenueUSD: number
  costUSD: number
  marginUSD: number
  marginPct: number
}

export default async function ProfitMarginReportPage() {
  const supabase = await createClient()

  // Fetch quotations that have both invoices and purchase orders
  const [{ data: invoices }, { data: pos }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, inv_number, quotation_id, issue_date, currency, exchange_rate, total_amount, buyers(company_name)')
      .not('quotation_id', 'is', null),
    supabase
      .from('purchase_orders')
      .select('id, po_number, quotation_id, total_amount, suppliers(name)')
      .not('quotation_id', 'is', null),
  ])

  const poByQuotation = new Map<
    string,
    { poNumber: string | null; supplierName: string; cost: number }
  >()

  for (const po of pos ?? []) {
    if (!po.quotation_id) continue
    const supplier = po.suppliers as unknown as { name: string } | null
    const existing = poByQuotation.get(po.quotation_id)
    const cost = po.total_amount ?? 0
    if (existing) {
      existing.cost += cost
    } else {
      poByQuotation.set(po.quotation_id, {
        poNumber: po.po_number,
        supplierName: supplier?.name ?? '—',
        cost,
      })
    }
  }

  const deals: MarginDeal[] = []
  let totalRevenue = 0
  let totalCost = 0

  for (const inv of invoices ?? []) {
    if (!inv.quotation_id) continue
    const buyer = inv.buyers as unknown as { company_name: string } | null
    const linkedPO = poByQuotation.get(inv.quotation_id)

    const rev = inv.total_amount ?? 0
    const cost = linkedPO ? linkedPO.cost : 0
    const margin = rev - cost
    const marginPct = rev > 0 ? (margin / rev) * 100 : 0

    totalRevenue += rev
    totalCost += cost

    deals.push({
      quotationId: inv.quotation_id,
      quoNumber: 'Quotation',
      invNumber: inv.inv_number,
      poNumber: linkedPO?.poNumber ?? null,
      buyerName: buyer?.company_name ?? '—',
      supplierName: linkedPO?.supplierName ?? 'Belum ada PO',
      issueDate: inv.issue_date,
      currency: inv.currency,
      revenueUSD: rev,
      costUSD: cost,
      marginUSD: margin,
      marginPct,
    })
  }

  const totalMargin = totalRevenue - totalCost
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="px-6 py-8 lg:px-8">
      {/* Back & Header */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Hub Laporan
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analisis Margin Keuntungan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Perhitungan estimasi gross profit berdasarkan perbandingan harga jual Invoice dan harga beli PO.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Total Revenue (Invoice)
          </p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalRevenue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{deals.length} deal terhubung</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Total Modal Beli (PO)
          </p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalCost)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Pengadaan ke supplier</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Total Margin Kotor
          </p>
          <p className="text-2xl font-bold" style={{ color: '#1a472a' }}>
            {fmt(totalMargin)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Gross profit</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Rata-rata Margin %
          </p>
          <p className="text-2xl font-bold" style={{ color: '#c9a227' }}>
            {avgMarginPct.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">terhadap omset jual</p>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Rincian Margin per Transaksi (Quotation → Invoice → PO)
          </h2>
          <span className="text-xs text-gray-400">{deals.length} transaksi</span>
        </div>

        {!deals.length ? (
          <div className="p-12 text-center text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30 text-amber-500" />
            <p className="text-sm">
              Belum ada transaksi yang menghubungkan Invoice dan Purchase Order melalui Quotation.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Saat membuat PO dari Quotation yang sudah di-invoice, data margin akan muncul di sini.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                <th className="px-5 py-3 text-left">No. Invoice</th>
                <th className="px-4 py-3 text-left">Buyer</th>
                <th className="px-4 py-3 text-left">No. PO & Supplier</th>
                <th className="px-4 py-3 text-right">Revenue ($)</th>
                <th className="px-4 py-3 text-right">Cost ($)</th>
                <th className="px-4 py-3 text-right">Margin ($)</th>
                <th className="px-5 py-3 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {d.invNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{d.buyerName}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{d.poNumber ?? '—'}</p>
                    <p className="text-xs text-gray-400">{d.supplierName}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {fmt(d.revenueUSD)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-500">
                    {fmt(d.costUSD)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: d.marginUSD >= 0 ? '#1a472a' : '#dc2626' }}>
                    {fmt(d.marginUSD)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-medium">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-xs ${
                        d.marginPct >= 15
                          ? 'bg-green-50 text-green-700'
                          : d.marginPct >= 0
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {d.marginPct.toFixed(1)}%
                    </span>
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
