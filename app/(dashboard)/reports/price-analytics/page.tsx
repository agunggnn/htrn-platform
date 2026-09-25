import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Download } from 'lucide-react'
import { PriceDetailChart } from '@/components/prices/PriceChart'

type Props = { searchParams: Promise<{ item?: string }> }

type DataPoint = { date: string; [grade: string]: number | string }

export default async function PriceAnalyticsReportPage({ searchParams }: Props) {
  const { item: selectedItemId } = await searchParams
  const supabase = await createClient()

  // Fetch all active items
  const { data: items } = await supabase
    .from('items')
    .select('id, name, name_en, unit, hs_code')
    .eq('is_active', true)
    .order('name')

  const activeItem =
    (items ?? []).find((i) => i.id === selectedItemId) ?? (items ?? [])[0]

  let chartData: DataPoint[] = []
  let grades: string[] = []
  let stats = { min: 0, max: 0, avg: 0, count: 0 }

  if (activeItem) {
    // Fetch price history for the selected item
    const { data: history } = await supabase
      .from('price_history')
      .select('price_date, grade_code, price_per_unit')
      .eq('item_id', activeItem.id)
      .order('price_date', { ascending: true })

    if (history && history.length > 0) {
      const gradeSet = new Set<string>()
      const dateMap = new Map<string, DataPoint>()

      let sumPrice = 0
      let minP = Number.MAX_VALUE
      let maxP = 0

      for (const h of history) {
        gradeSet.add(h.grade_code)
        sumPrice += h.price_per_unit
        if (h.price_per_unit < minP) minP = h.price_per_unit
        if (h.price_per_unit > maxP) maxP = h.price_per_unit

        const entry = dateMap.get(h.price_date) ?? ({ date: h.price_date } as DataPoint)
        entry[h.grade_code] = h.price_per_unit
        dateMap.set(h.price_date, entry)
      }

      chartData = Array.from(dateMap.values())
      grades = Array.from(gradeSet)
      stats = {
        min: minP === Number.MAX_VALUE ? 0 : minP,
        max: maxP,
        avg: history.length > 0 ? sumPrice / history.length : 0,
        count: history.length,
      }
    }
  }

  const fmtIDR = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="px-6 py-8 lg:px-8">
      {/* Header */}
      <Link
        href="/reports"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Hub Laporan
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analisis & Tren Harga Rempah</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Dinamika pergerakan harga pasar harian komoditas per grade dan varietas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/export/prices"
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: '#1a472a' }}
          >
            <Download className="w-4 h-4" /> Export CSV Harga
          </a>
        </div>
      </div>

      {/* Commodity Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-gray-200">
        {(items ?? []).map((it) => (
          <Link
            key={it.id}
            href={`/reports/price-analytics?item=${it.id}`}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              activeItem?.id === it.id
                ? 'text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={activeItem?.id === it.id ? { backgroundColor: '#1a472a' } : {}}
          >
            {it.name} {it.name_en ? `(${it.name_en})` : ''}
          </Link>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Harga Rata-rata
          </p>
          <p className="text-2xl font-bold text-gray-900">{fmtIDR(stats.avg)}</p>
          <p className="text-xs text-gray-400 mt-0.5">per {activeItem?.unit ?? 'kg'}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Harga Terendah
          </p>
          <p className="text-2xl font-bold text-green-700">{fmtIDR(stats.min)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Batas bawah catatan</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Harga Tertinggi
          </p>
          <p className="text-2xl font-bold text-amber-700">{fmtIDR(stats.max)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Batas atas puncak</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Jumlah Entri Histori
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
          <p className="text-xs text-gray-400 mt-0.5">catatan harga harian</p>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1a472a]" />
            <h2 className="text-base font-bold text-gray-900">
              Grafik Pergerakan Harga: {activeItem?.name}
            </h2>
          </div>
          <span className="text-xs font-medium text-gray-400">
            {grades.length} grade terpantau
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            Belum ada histori harga untuk komoditas {activeItem?.name}.
          </div>
        ) : (
          <PriceDetailChart data={chartData} grades={grades} />
        )}
      </div>
    </div>
  )
}
