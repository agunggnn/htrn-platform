import { createClient } from '@/lib/supabase/server'

// ---- Types for dashboard widgets ----

export type MonthlyRevenue = {
  month: string
  paid: number
  outstanding: number
}

export type PriceTick = {
  itemName: string
  gradeCode: string
  todayPrice: number
  yesterdayPrice: number
}

export type PipelineStage = {
  label: string
  count: number
  value: number
  color: string
  href: string
}

export type TopBuyer = {
  id: string
  companyName: string
  country: string | null
  totalValue: number
  invoiceCount: number
  lastActivity: string
}

export type Deadline = {
  id: string
  type: 'quotation_expiry' | 'invoice_due' | 'po_delivery'
  label: string
  counterparty: string
  dueDate: string
  daysLeft: number
  value: number | null
  href: string
}

// ---- Data-fetching functions ----

/** Revenue per month for the last 6 months (paid vs outstanding) */
export async function getMonthlyRevenue(): Promise<MonthlyRevenue[]> {
  const supabase = await createClient()

  // Fetch all invoices from the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
  sixMonthsAgo.setDate(1)
  const since = sixMonthsAgo.toISOString().split('T')[0]

  const { data: invoices } = await supabase
    .from('invoices')
    .select('issue_date, status, total_amount, amount_due')
    .gte('issue_date', since)
    .order('issue_date')

  // Group by month
  const monthMap = new Map<string, { paid: number; outstanding: number }>()

  // Pre-fill 6 months
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - 5 + i)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    monthMap.set(key, { paid: 0, outstanding: 0 })
  }

  for (const inv of invoices ?? []) {
    const d = new Date(inv.issue_date)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const entry = monthMap.get(key)
    if (!entry) continue
    const amount = inv.total_amount ?? 0
    if (inv.status === 'paid') {
      entry.paid += amount
    } else if (['sent', 'partial', 'overdue'].includes(inv.status)) {
      entry.outstanding += inv.amount_due ?? 0
    }
  }

  return Array.from(monthMap.entries()).map(([month, vals]) => ({
    month,
    ...vals,
  }))
}

/** Today's spice prices vs yesterday */
export async function getPriceTicks(): Promise<PriceTick[]> {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [{ data: todayPrices }, { data: yesterdayPrices }, { data: items }] = await Promise.all([
    supabase
      .from('price_history')
      .select('item_id, grade_code, price_per_unit')
      .eq('price_date', today),
    supabase
      .from('price_history')
      .select('item_id, grade_code, price_per_unit')
      .eq('price_date', yesterday),
    supabase.from('items').select('id, name').eq('is_active', true),
  ])

  const itemNames = new Map((items ?? []).map((i) => [i.id, i.name]))
  const yesterdayMap = new Map(
    (yesterdayPrices ?? []).map((p) => [`${p.item_id}:${p.grade_code}`, p.price_per_unit])
  )

  return (todayPrices ?? []).map((p) => ({
    itemName: itemNames.get(p.item_id) ?? '?',
    gradeCode: p.grade_code,
    todayPrice: p.price_per_unit,
    yesterdayPrice: yesterdayMap.get(`${p.item_id}:${p.grade_code}`) ?? 0,
  }))
}

/** Sales pipeline stages from quotation to paid */
export async function getSalesPipeline(): Promise<PipelineStage[]> {
  const supabase = await createClient()

  const [{ data: quotations }, { data: invoices }] = await Promise.all([
    supabase.from('quotations').select('status, total_amount'),
    supabase.from('invoices').select('status, total_amount'),
  ])

  const quoByStatus = (status: string) =>
    (quotations ?? []).filter((q) => q.status === status)

  const invByStatus = (status: string) =>
    (invoices ?? []).filter((i) => i.status === status)

  const sum = (arr: { total_amount: number | null }[]) =>
    arr.reduce((s, r) => s + (r.total_amount ?? 0), 0)

  const draftQuo = quoByStatus('draft')
  const sentQuo = quoByStatus('sent')
  const acceptedQuo = quoByStatus('accepted')
  const invoiced = [...invByStatus('draft'), ...invByStatus('sent'), ...invByStatus('partial'), ...invByStatus('overdue')]
  const paid = invByStatus('paid')

  return [
    {
      label: 'Draft Quo',
      count: draftQuo.length,
      value: sum(draftQuo),
      color: '#94a3b8',
      href: '/quotations?status=draft',
    },
    {
      label: 'Sent Quo',
      count: sentQuo.length,
      value: sum(sentQuo),
      color: '#3b82f6',
      href: '/quotations?status=sent',
    },
    {
      label: 'Accepted',
      count: acceptedQuo.length,
      value: sum(acceptedQuo),
      color: '#c9a227',
      href: '/quotations?status=accepted',
    },
    {
      label: 'Invoiced',
      count: invoiced.length,
      value: sum(invoiced),
      color: '#1a472a',
      href: '/invoices',
    },
    {
      label: 'Paid',
      count: paid.length,
      value: sum(paid),
      color: '#16a34a',
      href: '/invoices?status=paid',
    },
  ]
}

/** Top 5 buyers by total paid invoice value */
export async function getTopBuyers(): Promise<TopBuyer[]> {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('buyer_id, total_amount, status, created_at, buyers(id, company_name, country)')
    .not('buyer_id', 'is', null)

  // Aggregate by buyer
  const buyerMap = new Map<
    string,
    {
      id: string
      companyName: string
      country: string | null
      totalValue: number
      invoiceCount: number
      lastActivity: string
    }
  >()

  for (const inv of invoices ?? []) {
    const buyer = inv.buyers as unknown as { id: string; company_name: string; country: string | null } | null
    if (!buyer) continue

    const existing = buyerMap.get(buyer.id)
    const amount = inv.total_amount ?? 0

    if (existing) {
      existing.totalValue += amount
      existing.invoiceCount += 1
      if (inv.created_at > existing.lastActivity) {
        existing.lastActivity = inv.created_at
      }
    } else {
      buyerMap.set(buyer.id, {
        id: buyer.id,
        companyName: buyer.company_name,
        country: buyer.country,
        totalValue: amount,
        invoiceCount: 1,
        lastActivity: inv.created_at,
      })
    }
  }

  return Array.from(buyerMap.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)
}

/** Upcoming deadlines within 7 days + overdue items */
export async function getUpcomingDeadlines(): Promise<Deadline[]> {
  const supabase = await createClient()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const weekLater = new Date(today.getTime() + 7 * 86400000).toISOString().split('T')[0]

  const [{ data: quotations }, { data: invoicesDue }, { data: pos }] = await Promise.all([
    // Quotations expiring within 7 days or already expired (active ones)
    supabase
      .from('quotations')
      .select('id, quo_number, valid_until, total_amount, buyer_id, buyers(company_name)')
      .in('status', ['draft', 'sent'])
      .not('valid_until', 'is', null)
      .lte('valid_until', weekLater)
      .order('valid_until'),

    // Invoices due within 7 days or overdue
    supabase
      .from('invoices')
      .select('id, inv_number, due_date, amount_due, buyer_id, buyers(company_name)')
      .in('status', ['sent', 'partial', 'overdue'])
      .not('due_date', 'is', null)
      .lte('due_date', weekLater)
      .order('due_date'),

    // POs with expected delivery within 7 days
    supabase
      .from('purchase_orders')
      .select('id, po_number, expected_date, total_amount, supplier_id, suppliers(name)')
      .in('status', ['sent', 'confirmed'])
      .not('expected_date', 'is', null)
      .lte('expected_date', weekLater)
      .order('expected_date'),
  ])

  function daysUntil(dateStr: string): number {
    const target = new Date(dateStr)
    return Math.ceil((target.getTime() - today.getTime()) / 86400000)
  }

  const deadlines: Deadline[] = []

  for (const q of quotations ?? []) {
    const buyer = q.buyers as unknown as { company_name: string } | null
    deadlines.push({
      id: q.id,
      type: 'quotation_expiry',
      label: q.quo_number ?? 'Draft Quotation',
      counterparty: buyer?.company_name ?? '—',
      dueDate: q.valid_until!,
      daysLeft: daysUntil(q.valid_until!),
      value: q.total_amount,
      href: `/quotations/${q.id}`,
    })
  }

  for (const inv of invoicesDue ?? []) {
    const buyer = inv.buyers as unknown as { company_name: string } | null
    deadlines.push({
      id: inv.id,
      type: 'invoice_due',
      label: inv.inv_number ?? 'Draft Invoice',
      counterparty: buyer?.company_name ?? '—',
      dueDate: inv.due_date!,
      daysLeft: daysUntil(inv.due_date!),
      value: inv.amount_due,
      href: `/invoices/${inv.id}`,
    })
  }

  for (const po of pos ?? []) {
    const supplier = po.suppliers as unknown as { name: string } | null
    deadlines.push({
      id: po.id,
      type: 'po_delivery',
      label: po.po_number ?? 'Draft PO',
      counterparty: supplier?.name ?? '—',
      dueDate: po.expected_date!,
      daysLeft: daysUntil(po.expected_date!),
      value: po.total_amount,
      href: `/purchase-orders/${po.id}`,
    })
  }

  // Sort by urgency: most overdue/urgent first
  deadlines.sort((a, b) => a.daysLeft - b.daysLeft)

  return deadlines.slice(0, 8)
}
