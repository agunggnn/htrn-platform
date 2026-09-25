import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ItemPriceCard } from '@/components/prices/ItemPriceCard'

function pickBestPrice(entries: { price_per_unit: number; source_type?: string | null }[]) {
  if (!entries || entries.length === 0) return null
  return (
    entries.find((e) => e.source_type === 'selling_tier_1') ??
    entries.find((e) => e.source_type === 'selling_tier_2') ??
    entries.find((e) => e.source_type === 'market') ??
    entries.find((e) => e.source_type === 'contract') ??
    entries[entries.length - 1]
  )
}

export default async function PricesPage() {
  const supabase = await createClient()

  // Use local time (WIB / UTC+7) or UTC fallback for current date
  const now = new Date()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
  const yesterdayDate = new Date(now.getTime() - 86400000)
  const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(yesterdayDate)
  const sevenDaysAgoDate = new Date(now.getTime() - 7 * 86400000)
  const sevenDaysAgo = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(sevenDaysAgoDate)

  const [{ data: items }, { data: grades }, { data: suppliers }, { data: recentPrices }] =
    await Promise.all([
      supabase.from('items').select('*').eq('is_active', true).order('name'),
      supabase.from('item_grades').select('*').eq('is_active', true),
      supabase.from('suppliers').select('*').eq('is_active', true),
      supabase
        .from('price_history')
        .select('item_id, grade_code, price_per_unit, price_date, source_type, created_at')
        .gte('price_date', sevenDaysAgo)
        .order('price_date', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

  const itemList = items ?? []
  const gradeList = grades ?? []
  const supplierList = suppliers ?? []
  const prices = recentPrices ?? []

  // Build price rows per item
  const priceRowsMap = itemList.map((item) => {
    const itemGrades = gradeList.filter((g) => g.item_id === item.id)
    const itemPrices = prices.filter((p) => p.item_id === item.id)

    const priceRows = itemGrades.map((g) => {
      const gradePrices = itemPrices
        .filter((p) => p.grade_code === g.grade_code)
        .sort((a, b) => a.price_date.localeCompare(b.price_date))

      // Group by date to handle multiple sources (supplier, selling_tier_1, market)
      const byDate = new Map<string, typeof gradePrices>()
      gradePrices.forEach((p) => {
        const list = byDate.get(p.price_date) ?? []
        list.push(p)
        byDate.set(p.price_date, list)
      })

      // Sparkline data: one clean best-price point per date
      const sparkline: { date: string; [k: string]: number | string }[] = []
      Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([pDate, dEntries]) => {
          const best = pickBestPrice(dEntries)
          if (best) {
            sparkline.push({ date: pDate.slice(5), [g.grade_code]: best.price_per_unit })
          }
        })

      const todayEntries = byDate.get(today) ?? []
      const yesterdayEntries = byDate.get(yesterday) ?? []

      const todayBest = pickBestPrice(todayEntries)
      const yesterdayBest = pickBestPrice(yesterdayEntries)

      // Fallback: If today's price has not yet been recorded, display the most recent price
      const allSortedDates = Array.from(byDate.keys()).sort()
      const mostRecentDate = allSortedDates[allSortedDates.length - 1]
      const mostRecentBest = mostRecentDate ? pickBestPrice(byDate.get(mostRecentDate)!) : null

      const displayToday = todayBest?.price_per_unit ?? mostRecentBest?.price_per_unit ?? null
      const displayYesterday = todayBest ? yesterdayBest?.price_per_unit ?? null : null

      return {
        grade_code: g.grade_code,
        today: displayToday,
        yesterday: displayYesterday,
        sparkline,
      }
    })

    return { item, grades: itemGrades, priceRows }
  })

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Harga Rempah</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
        </div>
        <Link
          href="/prices/input"
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: '#1a472a' }}
        >
          Input Bulk Harian
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {priceRowsMap.map(({ item, grades: itemGrades, priceRows }) => (
          <ItemPriceCard
            key={item.id}
            item={item}
            grades={itemGrades}
            priceRows={priceRows}
            suppliers={supplierList}
          />
        ))}
      </div>
    </div>
  )
}
