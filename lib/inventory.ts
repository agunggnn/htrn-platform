import { createClient } from '@/lib/supabase/server'
import type { StockMovement, StockSummary } from '@/types'

export type RecordStockMovementInput = {
  itemId: string
  gradeCode: string
  movementType: 'in' | 'out' | 'adjustment'
  quantity: number
  unit?: string
  referenceType?: 'purchase_order' | 'invoice' | 'manual'
  referenceId?: string
  notes?: string
}

/**
 * Record a new stock movement entry (Stock IN from PO, Stock OUT from Invoice, or manual adjustment)
 */
export async function recordStockMovement({
  itemId,
  gradeCode,
  movementType,
  quantity,
  unit = 'kg',
  referenceType = 'manual',
  referenceId,
  notes,
}: RecordStockMovementInput): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase.from('stock_movements').insert({
      item_id: itemId,
      grade_code: gradeCode,
      movement_type: movementType,
      quantity,
      unit,
      reference_type: referenceType,
      reference_id: referenceId ?? null,
      notes: notes ?? null,
    })
  } catch (err) {
    console.error('Failed to record stock movement:', err)
  }
}

/**
 * Fetch all stock movement logs
 */
export async function getStockMovements(limit: number = 20): Promise<
  (StockMovement & { items: { name: string } | null })[]
> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('stock_movements')
      .select('*, items(name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data as unknown as (StockMovement & { items: { name: string } | null })[]) ?? []
  } catch (err) {
    console.error('Failed to fetch stock movements:', err)
    return []
  }
}

/**
 * Fetch aggregated stock levels per item & grade
 */
export async function getStockSummary(): Promise<StockSummary[]> {
  try {
    const supabase = await createClient()

    // Query stock movements and aggregate
    const [{ data: movements }, { data: items }, { data: grades }] = await Promise.all([
      supabase.from('stock_movements').select('*'),
      supabase.from('items').select('id, name, name_en, unit').eq('is_active', true),
      supabase.from('item_grades').select('item_id, grade_code').eq('is_active', true),
    ])

    const itemMap = new Map((items ?? []).map((i) => [i.id, i]))
    const summaryMap = new Map<string, StockSummary>()

    // Initialize map for all active items and grades
    for (const g of grades ?? []) {
      const itm = itemMap.get(g.item_id)
      if (!itm) continue
      const key = `${g.item_id}:${g.grade_code}`
      summaryMap.set(key, {
        item_id: g.item_id,
        item_name: itm.name,
        item_name_en: itm.name_en,
        unit: itm.unit ?? 'kg',
        grade_code: g.grade_code,
        total_in: 0,
        total_out: 0,
        current_stock: 0,
      })
    }

    for (const m of movements ?? []) {
      const key = `${m.item_id}:${m.grade_code}`
      const entry = summaryMap.get(key)
      if (!entry) continue

      const qty = Number(m.quantity) || 0
      if (m.movement_type === 'in') {
        entry.total_in += qty
        entry.current_stock += qty
      } else if (m.movement_type === 'out') {
        entry.total_out += qty
        entry.current_stock -= qty
      } else if (m.movement_type === 'adjustment') {
        entry.current_stock += qty
      }
    }

    return Array.from(summaryMap.values())
  } catch (err) {
    console.error('Failed to fetch stock summary:', err)
    return []
  }
}
