import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Download, Filter } from 'lucide-react'

type Props = { searchParams: Promise<{ range?: string }> }

type SalesInvoiceItem = {
  id: string
  invoice_id: string
  quantity: number
  unit_price: number
  subtotal: number
  description: string
  hs_code: string | null
}

type SalesInvoice = {
  id: string
  inv_number: string | null
  issue_date: string
  currency: string
  status: string
  total_amount: number | null
  buyers: { company_name: string; country: string | null } | null
  invoice_items: SalesInvoiceItem[]
}

export default async function SalesReportPage({ searchParams }: Props) {
  const { range = '6m' } = await searchParams
  const supabase = await createClient()

  // Calculate start date based on range filter
  const now = new Date()
  let startDate = new Date(now.getFullYear(), 0, 1) // default 1y

  if (range === '1m') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (range === '3m') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  } else if (range === '6m') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  } else if (range === 'all') {
    startDate = new Date(2020, 0, 1)
  }

  const sinceStr = startDate.toISOString().split('T')[0]

  const { data: rawInvoices } = await supabase
    .from('invoices')
    .select('id, inv_number, issue_date, currency, status, total_amount, buyers(company_name, country), invoice_items(id, invoice_id, quantity, unit_price, subtotal, description, hs_code)')
    .gte('issue_date', sinceStr)
    .order('issue_date', { ascending: false })

  const invoices = (rawInvoices as unknown as SalesInvoice[]) ?? []

  // Aggregate metrics
  const paidInvoices = invoices.filter((i) => ['paid', 'sent', 'partial'].includes(i.status))
  const totalRevenueUSD = paidInvoices.reduce((sum, i) => sum + (i.total_amount ?? 0), 0)
  const invoiceCount = paidInvoices.length
  const avgOrderValue = invoiceCount > 0 ? totalRevenueUSD / invoiceCount : 0

  // Buyer breakdown
  const buyerMap = new Map<string, { name: string; country: string; total: number; count: number }>()
  // Country breakdown
  const countryMap = new Map<string, { country: string; total: number; count: number }>()

  // Items breakdown
  let totalTonnageKg = 0
  const itemMap = new Map<string, { desc: string; totalQty: number; totalVal: number }>()

  for (const inv of paidInvoices) {
    const buyerName = inv.buyers?.company_name ?? '—'
    const country = inv.buyers?.country ?? 'Lainnya'
    const val = inv.total_amount ?? 0

    // Buyer aggregation
    const b = buyerMap.get(buyerName) ?? { name: buyerName, country, total: 0, count: 0 }
    b.total += val
    b.count += 1
    buyerMap.set(buyerName, b)

    // Country aggregation
    const c = countryMap.get(country) ?? { country, total: 0, count: 0 }
    c.total += val
    c.count += 1
    countryMap.set(country, c)

    // Items aggregation
    for (const item of inv.invoice_items ?? []) {
      totalTonnageKg += item.quantity ?? 0
      const desc = item.description || 'Rempah'
      const itm = itemMap.get(desc) ?? { desc, totalQty: 0, totalVal: 0 }
      itm.totalQty += item.quantity ?? 0
      itm.totalVal += item.subtotal ?? 0
      itemMap.set(desc, itm)
    }
  }

  const topBuyers = Array.from(buyerMap.values()).sort((a, b) => b.total - a.total)
  const topCountries = Array.from(countryMap.values()).sort((a, b) => b.total - a.total)
  const topItems = Array.from(itemMap.values()).sort((a, b) => b.totalVal - a.totalVal)

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="px-6 py-8 lg:px-8">
      {/* Back & Title */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Hub Laporan
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Penjualan (Sales Report)</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Analisis kinerja komersial dan distribusi ekspor rempah.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Range */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 text-sm">
            {[
              { id: '1m', label: '1B' },
              { id: '3m', label: '3B' },
              { id: '6m', label: '6B' },
              { id: '1y', label: '1T' },
              { id: 'all', label: 'Semua' },
            ].map((f) => (
              <Link
                key={f.id}
                href={`/reports/sales?range=${f.id}`}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  range === f.id
                    ? 'text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={range === f.id ? { backgroundColor: '#1a472a' } : {}}
              >
                {f.label}
              </Link>
            ))}
          </div>

          <a
            href="/api/export/invoices"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#1a472a' }}
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Total Omset Ekspor
          </p>
          <p className="text-2xl font-bold text-gray-900">{fmt(totalRevenueUSD)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{invoiceCount} invoice komersial</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Total Tonnage Ekspor
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {new Intl.NumberFormat('en-US').format(totalTonnageKg)} <span className="text-sm font-normal text-gray-500">kg</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{(totalTonnageKg / 1000).toFixed(1)} Metrik Ton</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Rata-rata Nilai Order
          </p>
          <p className="text-2xl font-bold text-gray-900">{fmt(avgOrderValue)}</p>
          <p className="text-xs text-gray-400 mt-0.5">per shipment / invoice</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Jumlah Buyer Aktif
          </p>
          <p className="text-2xl font-bold text-gray-900">{buyerMap.size}</p>
          <p className="text-xs text-gray-400 mt-0.5">di {countryMap.size} negara tujuan</p>
        </div>
      </div>

      {/* Tables Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Buyer Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Penjualan per Buyer
            </h2>
            <span className="text-xs text-gray-400">{topBuyers.length} buyer</span>
          </div>
          {!topBuyers.length ? (
            <p className="py-8 text-center text-sm text-gray-400">Belum ada transaksi di periode ini</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                  <th className="px-5 py-2.5 text-left">Perusahaan</th>
                  <th className="px-4 py-2.5 text-left">Negara</th>
                  <th className="px-4 py-2.5 text-center">Inv</th>
                  <th className="px-5 py-2.5 text-right">Nilai Total</th>
                </tr>
              </thead>
              <tbody>
                {topBuyers.map((b) => (
                  <tr key={b.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{b.name}</td>
                    <td className="px-4 py-3 text-gray-500">{b.country}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{b.count}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Country Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
              Penjualan per Negara Tujuan
            </h2>
            <span className="text-xs text-gray-400">{topCountries.length} negara</span>
          </div>
          {!topCountries.length ? (
            <p className="py-8 text-center text-sm text-gray-400">Belum ada transaksi di periode ini</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                  <th className="px-5 py-2.5 text-left">Negara</th>
                  <th className="px-4 py-2.5 text-center">Transaksi</th>
                  <th className="px-5 py-2.5 text-right">Total Nilai</th>
                  <th className="px-5 py-2.5 text-right">Porsi</th>
                </tr>
              </thead>
              <tbody>
                {topCountries.map((c) => {
                  const share = totalRevenueUSD > 0 ? (c.total / totalRevenueUSD) * 100 : 0
                  return (
                    <tr key={c.country} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-900">{c.country}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{c.count}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(c.total)}</td>
                      <td className="px-5 py-3 text-right text-xs text-gray-500 font-mono">
                        {share.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Commodity Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Penjualan per Deskripsi Komoditas / Produk
          </h2>
          <span className="text-xs text-gray-400">{topItems.length} produk</span>
        </div>
        {!topItems.length ? (
          <p className="py-8 text-center text-sm text-gray-400">Belum ada rincian item</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                <th className="px-5 py-2.5 text-left">Deskripsi Produk</th>
                <th className="px-4 py-2.5 text-right">Volume (kg)</th>
                <th className="px-4 py-2.5 text-right">Rata-rata $/kg</th>
                <th className="px-5 py-2.5 text-right">Total Nilai</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item) => {
                const avgPrice = item.totalQty > 0 ? item.totalVal / item.totalQty : 0
                return (
                  <tr key={item.desc} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-900">{item.desc}</td>
                    <td className="px-4 py-3 text-right text-gray-700 font-mono">
                      {new Intl.NumberFormat('en-US').format(item.totalQty)} kg
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 font-mono">
                      ${avgPrice.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {fmt(item.totalVal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
