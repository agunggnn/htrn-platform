import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SettlementStatus } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: settlement, error } = await supabase
      .from('supplier_settlements')
      .select('*, suppliers(*), quotations(*), invoices(*), buyers(*)')
      .eq('id', id)
      .maybeSingle()

    if (!error && settlement) {
      return NextResponse.json({ settlement })
    }

    // Fallback: check purchase order by ID
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(*), po_items(*)')
      .eq('id', id)
      .maybeSingle()

    if (po) {
      return NextResponse.json({ settlement: po })
    }

    return NextResponse.json({ error: 'Settlement tidak ditemukan' }, { status: 404 })
  } catch (error) {
    console.error('Error fetching single settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      status,
      bank_reference,
      settlement_date,
      bast_signed_url,
      notes,
    } = body as {
      status?: SettlementStatus
      bank_reference?: string
      settlement_date?: string
      bast_signed_url?: string
      notes?: string
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (status) updates.status = status
    if (bank_reference !== undefined) updates.bank_reference = bank_reference
    if (settlement_date !== undefined) updates.settlement_date = settlement_date
    if (bast_signed_url !== undefined) updates.bast_signed_url = bast_signed_url
    if (notes !== undefined) updates.notes = notes

    const { data, error } = await supabase
      .from('supplier_settlements')
      .update(updates)
      .eq('id', id)
      .select('*, suppliers(*), buyers(*)')
      .maybeSingle()

    if (!error && data) {
      return NextResponse.json({ settlement: data })
    }

    // Fallback: update purchase order status if applicable
    if (status) {
      let poStatus = 'draft'
      if (status === 'approved') poStatus = 'confirmed'
      if (status === 'in_progress') poStatus = 'sent'
      if (status === 'paid' || status === 'reconciled') poStatus = 'received'

      await supabase
        .from('purchase_orders')
        .update({
          status: poStatus,
          notes: notes || undefined,
          received_date: settlement_date || (status === 'paid' ? new Date().toISOString().split('T')[0] : undefined),
        })
        .eq('id', id)
    }

    return NextResponse.json({ success: true, updated: updates })
  } catch (error) {
    console.error('Error updating settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
