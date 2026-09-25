import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Vercel Cron authorization check
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const today = new Date()
  const threeDaysLater = new Date(today.getTime() + 3 * 86400000).toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  const remindersLogged: string[] = []

  // 1. Scan for expiring quotations
  const { data: expiringQuos } = await supabase
    .from('quotations')
    .select('id, quo_number, valid_until, buyers(company_name)')
    .in('status', ['draft', 'sent'])
    .gte('valid_until', todayStr)
    .lte('valid_until', threeDaysLater)

  for (const q of expiringQuos ?? []) {
    const buyer = q.buyers as unknown as { company_name: string } | null
    const desc = `Reminder: Quotation ${q.quo_number ?? 'Draft'} (${buyer?.company_name ?? 'Buyer'}) akan expired pada ${q.valid_until}`

    // Avoid duplicate log entry if already logged today
    const { data: existing } = await supabase
      .from('activity_log')
      .select('id')
      .eq('entity_type', 'quotation')
      .eq('entity_id', q.id)
      .gte('created_at', todayStr)
      .maybeSingle()

    if (!existing) {
      await supabase.from('activity_log').insert({
        entity_type: 'quotation',
        entity_id: q.id,
        action: 'status_changed',
        description: desc,
      })
      remindersLogged.push(desc)
    }
  }

  // 2. Scan for upcoming invoice due dates
  const { data: dueInvoices } = await supabase
    .from('invoices')
    .select('id, inv_number, due_date, amount_due, buyers(company_name)')
    .in('status', ['sent', 'partial'])
    .gte('due_date', todayStr)
    .lte('due_date', threeDaysLater)

  for (const inv of dueInvoices ?? []) {
    const buyer = inv.buyers as unknown as { company_name: string } | null
    const desc = `Reminder: Invoice ${inv.inv_number ?? 'Draft'} (${buyer?.company_name ?? 'Buyer'}) jatuh tempo pada ${inv.due_date}`

    const { data: existing } = await supabase
      .from('activity_log')
      .select('id')
      .eq('entity_type', 'invoice')
      .eq('entity_id', inv.id)
      .gte('created_at', todayStr)
      .maybeSingle()

    if (!existing) {
      await supabase.from('activity_log').insert({
        entity_type: 'invoice',
        entity_id: inv.id,
        action: 'status_changed',
        description: desc,
      })
      remindersLogged.push(desc)
    }
  }

  return NextResponse.json({
    success: true,
    remindersCount: remindersLogged.length,
    reminders: remindersLogged,
  })
}
