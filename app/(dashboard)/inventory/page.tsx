import { createClient } from '@/lib/supabase/server'
import { getStockSummary, getStockMovements } from '@/lib/inventory'
import { StockOverview } from '@/components/inventory/StockOverview'
import type { Item } from '@/types'

export const dynamic = 'force-dynamic'

export default async function InventoryPage() {
  const supabase = await createClient()

  const [summary, movements, { data: items }] = await Promise.all([
    getStockSummary(),
    getStockMovements(25),
    supabase.from('items').select('*').eq('is_active', true).order('name'),
  ])

  return (
    <div className="px-6 py-8 lg:px-8">
      <StockOverview
        summary={summary}
        movements={movements}
        items={(items as unknown as Item[]) ?? []}
      />
    </div>
  )
}
