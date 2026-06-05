import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PriceDetailChart } from '@/components/prices/PriceChart'

type Props = { params: Promise<{ itemId: string }>; searchParams: Promise<{ range?: string }> }

export default async function ItemDetailPage({ params, searchParams }: Props) {
  const { itemId } = await params
  const { range = '30' } = await searchParams
  const days = range === '7' ? 7 : range === '90' ? 90 : 30
  const supabase = await createClient()

  const since = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

  const [{ data: item }, { data: grades }, { data: history }] = await Promise.all([
    supabase.from('items').select('*').eq('id', itemId).single(),
    supabase.from('item_grades').select('*').eq('item_id', itemId).eq('is_active', true),
    supabase
      .from('price_history')
      .select('grade_code, price_per_unit, price_date')
      .eq('item_id', itemId)
      .gte('price_date', since)
      .order('price_date', { ascending: true }),
  ])

  if (!item) notFound()

  const gradeList = grades ?? []
  const historyList = history ?? []
  const gradeCodes = gradeList.map((g) => g.grade_code)

  // Build chart data: one row per date
  const dateMap = new Map<string, Record<string, number>>()
  historyList.forEach((p) => {
    const row = dateMap.get(p.price_date) ?? {}
    row[p.grade_code] = p.price_per_unit
    dateMap.set(p.price_date, row)
  })
  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date: date.slice(5), ...vals }))

  // Stats
  const stats = gradeCodes.map((grade) => {
    const vals = historyList.filter((p) => p.grade_code === grade).map((p) => p.price_per_unit)
    if (vals.length === 0) return null
    const latest = vals[vals.length - 1]
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    const high = Math.max(...vals)
    const low = Math.min(...vals)
    const first = vals[0]
    const pctChange = first > 0 ? ((latest - first) / first) * 100 : 0
    return { grade, latest, avg, high, low, pctChange }
  }).filter(Boolean)

  const fmt = (n: number) => `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(n))}`

  return (
    <div className="px-8 py-8">
      <Link href="/prices" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
          {item.name_en && <p className="text-sm text-gray-400">{item.name_en}</p>}
        </div>
        {/* Range selector */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {['7', '30', '90'].map((r) => (
            <Link
              key={r}
              href={`/prices/${itemId}?range=${r}`}
              className={`px-4 py-1.5 font-medium ${range === r ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={range === r ? { backgroundColor: '#1a472a' } : {}}
            >
              {r}d
            </Link>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        {chartData.length > 0 ? (
          <PriceDetailChart data={chartData} grades={gradeCodes} />
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Belum ada data dalam periode ini</p>
        )}
      </div>

      {/* Stats cards */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => s && (
            <div key={s.grade} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Grade {s.grade}</p>
              <p className="text-lg font-bold text-gray-900">{fmt(s.latest)}</p>
              <p className={`text-xs mt-0.5 ${s.pctChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {s.pctChange >= 0 ? '+' : ''}{s.pctChange.toFixed(1)}% ({days}h)
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-gray-400">
                <p>Rata: {fmt(s.avg)}</p>
                <p>Tertinggi: {fmt(s.high)}</p>
                <p>Terendah: {fmt(s.low)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Riwayat Harga</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">Tanggal</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Grade</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500">Harga (IDR/kg)</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Sumber</th>
              </tr>
            </thead>
            <tbody>
              {historyList.slice().reverse().map((p, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 text-gray-600">{p.price_date}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                      {p.grade_code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">
                    {new Intl.NumberFormat('id-ID').format(p.price_per_unit)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 capitalize">{(historyList as any)[historyList.length - 1 - i]?.source_type ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
