import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, FileText, ShieldCheck, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { PriceDetailChartLazy } from '@/components/prices/PriceDetailChartLazy'
import { getPublicMarketBenchmarks } from '@/lib/commodity-mentor'

type Props = { params: Promise<{ itemId: string }>; searchParams: Promise<{ range?: string }> }

export default async function ItemDetailPage({ params, searchParams }: Props) {
  const { itemId } = await params
  const { range = '30' } = await searchParams
  const days = range === '7' ? 7 : range === '90' ? 90 : 30
  const supabase = await createClient()

  const sinceDate = new Date()
  sinceDate.setUTCDate(sinceDate.getUTCDate() - days)
  const since = sinceDate.toISOString().split('T')[0]

  const [{ data: item }, { data: grades }, { data: history }] = await Promise.all([
    supabase.from('items').select('*').eq('id', itemId).single(),
    supabase.from('item_grades').select('*').eq('item_id', itemId).eq('is_active', true),
    supabase
      .from('price_history')
      .select('id, grade_code, price_per_unit, price_date, source_type')
      .eq('item_id', itemId)
      .gte('price_date', since)
      .order('price_date', { ascending: true }),
  ])

  if (!item) notFound()

  const gradeList = grades ?? []
  const historyList = history ?? []
  const gradeCodes = gradeList.map((g) => g.grade_code)

  // Build chart data: one row per date, prioritizing selling prices over raw supplier cost
  const dateMap = new Map<string, Record<string, number>>()
  const sourcePriority = (s?: string | null) =>
    s === 'selling_tier_1' ? 4 : s === 'selling_tier_2' ? 3 : s === 'market' ? 2 : s === 'contract' ? 1 : 0

  const sortedForChart = [...historyList].sort((a, b) => sourcePriority(a.source_type) - sourcePriority(b.source_type))
  sortedForChart.forEach((p) => {
    const row = dateMap.get(p.price_date) ?? {}
    row[p.grade_code] = p.price_per_unit
    dateMap.set(p.price_date, row)
  })
  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date: date.slice(5), ...vals }))

  // Stats
  const stats = gradeCodes
    .map((grade) => {
      const vals = historyList.filter((p) => p.grade_code === grade).map((p) => p.price_per_unit)
      if (vals.length === 0) return null
      const latest = vals[vals.length - 1]
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      const high = Math.max(...vals)
      const low = Math.min(...vals)
      const first = vals[0]
      const pctChange = first > 0 ? ((latest - first) / first) * 100 : 0
      return { grade, latest, avg, high, low, pctChange }
    })
    .filter(Boolean)

  const fmt = (n: number) => `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(n))}`
  const benchmarks = getPublicMarketBenchmarks()

  return (
    <div className="px-8 py-8">
      <Link
        href="/prices"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            {item.name === 'Bawang Merah Goreng' && (
              <div className="flex items-center gap-2">
                <Link
                  href="/api/pdf/spec-sheet/bawang-goreng"
                  target="_blank"
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5"
                  title="Lihat / Cetak Technical Data Sheet (TDS)"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                  TDS Spek ↗
                </Link>
                <Link
                  href="/api/pdf/halal-declaration/bawang-goreng"
                  target="_blank"
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5"
                  title="Lihat / Cetak Surat Jaminan Kehalalan & Mutu"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Jaminan Halal ↗
                </Link>
              </div>
            )}
          </div>
          {item.name_en && <p className="text-sm text-gray-400">{item.name_en}</p>}
        </div>
        {/* Range selector */}
        <div className="flex overflow-hidden rounded-lg border border-gray-200 text-sm shrink-0">
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
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
        {chartData.length > 0 ? (
          <PriceDetailChartLazy data={chartData} grades={gradeCodes} />
        ) : (
          <p className="py-8 text-center text-sm text-gray-400">Belum ada data dalam periode ini</p>
        )}
      </div>

      {/* Stats cards */}
      {stats.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map(
            (s) =>
              s && (
                <div key={s.grade} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="mb-2 text-xs font-semibold text-gray-700">
                    {s.grade === 'GRADE_A_SLICE'
                      ? 'Slice Renyah (Gr A)'
                      : s.grade === 'GRADE_B_CRUSHED'
                      ? 'Giling Kasar (Gr B)'
                      : s.grade === 'GRADE_POWDER'
                      ? 'Bubuk Halus'
                      : `Grade ${s.grade}`}
                  </p>
                  <p className="text-lg font-bold text-gray-900">{fmt(s.latest)}</p>
                  <p
                    className={`mt-0.5 text-xs ${s.pctChange >= 0 ? 'text-green-600' : 'text-red-500'}`}
                  >
                    {s.pctChange >= 0 ? '+' : ''}
                    {s.pctChange.toFixed(1)}% ({days}h)
                  </p>
                  <div className="mt-2 space-y-0.5 text-xs text-gray-400">
                    <p>Rata: {fmt(s.avg)}</p>
                    <p>Tertinggi: {fmt(s.high)}</p>
                    <p>Terendah: {fmt(s.low)}</p>
                  </div>
                </div>
              )
          )}
        </div>
      )}

      {/* Public Market Benchmark & Verification Card */}
      {item.name === 'Bawang Merah Goreng' && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-gray-50/40 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-emerald-100 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Indeks Pasar Terbuka Sah
                </span>
                <span className="text-xs text-gray-500">
                  Diperbarui: <strong>{benchmarks.syncTimestamp}</strong>
                </span>
              </div>
              <h2 className="text-base font-bold text-gray-900 mt-1">
                Audit Indeks Harga Bahan Mentah & Titik Impas Olahan Murni
              </h2>
            </div>
            <div className="text-xs text-gray-400">
              Verifikasi Terbuka ke Instansi Pemerintah RI
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* Kramat Jati Tile */}
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500 font-medium mb-1">
                {benchmarks.rawShallotKramatJati.marketName}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-gray-900">
                  {fmt(benchmarks.rawShallotKramatJati.pricePerKg)}
                </span>
                <span className="text-xs text-gray-400">/{benchmarks.rawShallotKramatJati.unit}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                +{benchmarks.rawShallotKramatJati.pctChange}% (vs kemarin)
              </div>
            </div>

            {/* Bapanas National Tile */}
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="text-xs text-gray-500 font-medium mb-1">
                {benchmarks.rawShallotBapanasNational.marketName}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-gray-900">
                  {fmt(benchmarks.rawShallotBapanasNational.pricePerKg)}
                </span>
                <span className="text-xs text-gray-400">/{benchmarks.rawShallotBapanasNational.unit}</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                +{benchmarks.rawShallotBapanasNational.pctChange}% (rata-rata nasional)
              </div>
            </div>

            {/* Equivalent Raw Cost Tile */}
            <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-gradient-to-br from-white to-amber-50/40">
              <div className="text-xs text-gray-500 font-medium mb-1">
                Ekuivalensi Modal Bahan Mentah (Susut 3.8x)
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-amber-900">
                  {fmt(benchmarks.equivalentRawMaterialCost)}
                </span>
                <span className="text-xs text-gray-400">/kg goreng jadi</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                Belum termasuk minyak nabati, gas & kemasan
              </div>
            </div>
          </div>

          {/* Transparent Conversion Formula */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-5 text-xs text-gray-600 leading-relaxed space-y-1.5">
            <div className="font-semibold text-gray-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-emerald-700" />
              Formula Konversi Ilmiah & Transparansi Biaya Pasokan:
            </div>
            <p>
              Bapanas dan Pasar Induk mencatat harga <em>Bawang Merah Mentah Basah</em>. Karena proses penggorengan higienis mengalami <strong>penyusutan kadar air alami 3,8x lipat</strong> (dibutuhkan 3,8 kg bawang basah segar untuk menghasilkan 1 kg bawang goreng murni tiris sentrifugal), maka nilai modal bahan mentah saja setara dengan <strong>{fmt(benchmarks.equivalentRawMaterialCost)}/kg</strong>.
            </p>
            <p className="text-[11px] text-gray-500">
              * Bersama biaya minyak kelapa sawit nabati mutu pangan, kemasan inner PE food-grade ganda, dan master karton corrugated, struktur penawaran resmi Haturan (Rp 144.000 – Rp 165.000/kg Franco) merupakan harga volume industri yang sangat kompetitif dan terjamin mutunya.
            </p>
          </div>

          {/* Official Verification Sources Buttons */}
          <div>
            <div className="text-xs font-bold text-gray-700 mb-2">
              Tautan Verifikasi Langsung ke Sumber Resmi Pemerintah:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {benchmarks.sources.map((src) => (
                <a
                  key={src.url}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left group"
                >
                  <div>
                    <div className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 flex items-center gap-1">
                      {src.shortCode}
                      <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-emerald-700" />
                    </div>
                    <div className="text-[10px] text-gray-500">{src.institution}</div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                      {src.updateFrequency}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Riwayat Harga</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-500">Tanggal</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Grade</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">
                  Harga (IDR/kg)
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Sumber</th>
              </tr>
            </thead>
            <tbody>
              {historyList
                .slice()
                .reverse()
                .map((p) => (
                  <tr
                    key={p.id || `${p.price_date}-${p.grade_code}-${p.source_type}`}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-5 py-2.5 text-gray-600">{p.price_date}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        {p.grade_code === 'GRADE_A_SLICE'
                          ? 'Slice Renyah'
                          : p.grade_code === 'GRADE_B_CRUSHED'
                          ? 'Giling Kasar'
                          : p.grade_code === 'GRADE_POWDER'
                          ? 'Bubuk Halus'
                          : p.grade_code}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {new Intl.NumberFormat('id-ID').format(p.price_per_unit)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                      {p.source_type === 'selling_tier_1'
                        ? 'Tier 1 HORECA'
                        : p.source_type === 'selling_tier_2'
                        ? 'Tier 2 Katering'
                        : p.source_type === 'supplier'
                        ? 'Modal Supplier'
                        : p.source_type === 'market'
                        ? 'Pasar Bebas'
                        : p.source_type === 'benchmark'
                        ? 'Benchmark Internal'
                        : p.source_type ?? '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
