import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ItemPriceCard } from '@/components/prices/ItemPriceCard'

export default async function PricesPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [{ data: items }, { data: grades }, { data: suppliers }, { data: recentPrices }] =
    await Promise.all([
      supabase.from('items').select('*').eq('is_active', true).order('name'),
      supabase.from('item_grades').select('*').eq('is_active', true),
      supabase.from('suppliers').select('*').eq('is_active', true),
      supabase
        .from('price_history')
        .select('item_id, grade_code, price_per_unit, price_date')
        .gte('price_date', sevenDaysAgo)
        .order('price_date', { ascending: true }),
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

      const todayEntry = gradePrices.find((p) => p.price_date === today)
      const yesterdayEntry = gradePrices.find((p) => p.price_date === yesterday)

      // Sparkline data: last 7 days
      const sparkline = gradePrices.reduce<{ date: string; [k: string]: number | string }[]>(
        (acc, p) => {
          const existing = acc.find((d) => d.date === p.price_date)
          if (existing) {
            existing[g.grade_code] = p.price_per_unit
          } else {
            acc.push({ date: p.price_date.slice(5), [g.grade_code]: p.price_per_unit })
          }
          return acc
        },
        []
      )

      return {
        grade_code: g.grade_code,
        today: todayEntry?.price_per_unit ?? null,
        yesterday: yesterdayEntry?.price_per_unit ?? null,
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
