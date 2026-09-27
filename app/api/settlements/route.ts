import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateFulfillmentFinancials } from '@/lib/fulfillment-helper'
import type {
  SupplierSettlement,
  SettlementStatus,
  Supplier,
  Quotation,
  Invoice,
  Buyer,
} from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // 1. Try querying dedicated supplier_settlements table
    let query = supabase
      .from('supplier_settlements')
      .select('*, suppliers(*), quotations(*), invoices(*), buyers(*)')
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data: tableData, error: tableErr } = await query

    let settlements: SupplierSettlement[] = []

    if (!tableErr && tableData && tableData.length > 0) {
      settlements = tableData as unknown as SupplierSettlement[]
    } else {
      // 2. Resilient Fallback: construct settlements dynamically from purchase_orders + invoices + quotations
      const [{ data: pos }, { data: invoices }, { data: quotations }] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('*, suppliers(*), po_items(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('*, buyers(*)')
          .not('quotation_id', 'is', null),
        supabase
          .from('quotations')
          .select('*, buyers(*), quotation_items(*)')
      ])

      const invByQuo = new Map((invoices || []).map((inv) => [inv.quotation_id, inv]))
      const quoById = new Map((quotations || []).map((q) => [q.id, q]))

      for (const po of pos || []) {
        const quo = po.quotation_id ? quoById.get(po.quotation_id) : null
        const inv = po.quotation_id ? invByQuo.get(po.quotation_id) : null
        const buyer = (inv?.buyers || quo?.buyers) as Record<string, unknown> | null
        const supplier = po.suppliers as Record<string, unknown> | null
        const poItem = po.po_items?.[0] as Record<string, unknown> | undefined

        const volumeKg = Number(poItem?.quantity_ordered) || 500
        const supplierHpp = Number(poItem?.unit_price) || 125000
        const sellingPrice = inv?.total_amount && volumeKg > 0 ? Math.round(Number(inv.total_amount) / volumeKg) : 155000

        const financials = calculateFulfillmentFinancials(volumeKg, sellingPrice, supplierHpp)

        let status: SettlementStatus = 'pending'
        if (po.status === 'confirmed') status = 'approved'
        if (po.status === 'received') status = 'in_progress'

        const settlementRecord: SupplierSettlement = {
          id: po.id,
          settlement_number: `STL-${po.po_number || po.id.slice(0, 8).toUpperCase()}`,
          quotation_id: po.quotation_id,
          invoice_id: inv?.id || null,
          supplier_id: po.supplier_id,
          buyer_id: (buyer?.id as string) || null,
          commodity_name: 'Bawang Merah Goreng',
          grade_code: (poItem?.grade_code as string) || 'GRADE_A_SLICE',
          volume_kg: volumeKg,
          selling_price_per_kg: sellingPrice,
          total_buyer_payment: financials.totalRevenue,
          supplier_hpp_per_kg: supplierHpp,
          total_supplier_hpp: financials.totalSupplierCost,
          packaging_cost: financials.totalPackagingCost,
          delivery_cost: financials.deliveryCost,
          gross_profit: financials.grossProfitIdr,
          gross_margin_pct: financials.grossMarginPct,
          net_supplier_payout: financials.totalSupplierCost,
          platform_net_profit: financials.grossProfitIdr,
          status,
          settlement_date: po.received_date || null,
          payment_method: 'bank_transfer',
          notes: po.notes || 'Maklon & Hub Sortasi Bogor (CV Daun Mas / Mas Parmin)',
          created_at: po.created_at || new Date().toISOString(),
          updated_at: po.created_at || new Date().toISOString(),
          suppliers: supplier as unknown as Supplier,
          quotations: quo as unknown as Quotation,
          invoices: inv as unknown as Invoice,
          buyers: buyer as unknown as Buyer,
        }

        if (!statusFilter || statusFilter === 'all' || statusRecordMatch(status, statusFilter)) {
          settlements.push(settlementRecord)
        }
      }
    }

    // 3. Compute Summary Statistics
    const totalTransactions = settlements.length
    const totalVolumeKg = settlements.reduce((s, it) => s + (Number(it.volume_kg) || 0), 0)
    const totalRevenue = settlements.reduce((s, it) => s + (Number(it.total_buyer_payment) || 0), 0)
    const totalSupplierHpp = settlements.reduce((s, it) => s + (Number(it.total_supplier_hpp) || 0), 0)
    const totalPackagingCost = settlements.reduce((s, it) => s + (Number(it.packaging_cost) || 0), 0)
    const totalDeliveryCost = settlements.reduce((s, it) => s + (Number(it.delivery_cost) || 0), 0)
    const totalGrossProfit = settlements.reduce((s, it) => s + (Number(it.platform_net_profit) || 0), 0)
    const avgGrossMarginPct = totalRevenue > 0 ? Number(((totalGrossProfit / totalRevenue) * 100).toFixed(1)) : 0
    const totalPendingPayout = settlements
      .filter((s) => s.status === 'pending' || s.status === 'approved' || s.status === 'in_progress')
      .reduce((s, it) => s + (Number(it.net_supplier_payout) || 0), 0)
    const totalSettledPayout = settlements
      .filter((s) => s.status === 'paid' || s.status === 'reconciled')
      .reduce((s, it) => s + (Number(it.net_supplier_payout) || 0), 0)

    return NextResponse.json({
      settlements,
      summary: {
        totalTransactions,
        totalVolumeKg,
        totalRevenue,
        totalSupplierHpp,
        totalPackagingCost,
        totalDeliveryCost,
        totalGrossProfit,
        avgGrossMarginPct,
        totalPendingPayout,
        totalSettledPayout,
      },
    })
  } catch (error) {
    console.error('Error fetching settlements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function statusRecordMatch(status: SettlementStatus, filter: string): boolean {
  if (filter === 'pending') return status === 'pending' || status === 'approved'
  if (filter === 'in_progress') return status === 'in_progress'
  if (filter === 'paid') return status === 'paid' || status === 'reconciled'
  return status === filter
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      quotation_id,
      invoice_id,
      supplier_id,
      buyer_id,
      commodity_name = 'Bawang Merah Goreng',
      grade_code = 'GRADE_A_SLICE',
      volume_kg,
      selling_price_per_kg,
      supplier_hpp_per_kg = 125000,
      packaging_cost,
      delivery_cost,
      notes,
    } = body

    if (!supplier_id || !volume_kg || !selling_price_per_kg) {
      return NextResponse.json(
        { error: 'Field supplier_id, volume_kg, dan selling_price_per_kg wajib diisi' },
        { status: 400 }
      )
    }

    const qty = Number(volume_kg)
    const price = Number(selling_price_per_kg)
    const hpp = Number(supplier_hpp_per_kg)
    const financials = calculateFulfillmentFinancials(qty, price, hpp, {
      packagingCostPerBox: packaging_cost !== undefined ? Number(packaging_cost) : undefined,
      deliveryCost: delivery_cost !== undefined ? Number(delivery_cost) : undefined,
    })

    const settlementNumber = `STL/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Math.floor(1000 + Math.random() * 9000)}`

    const { data, error } = await supabase
      .from('supplier_settlements')
      .insert({
        settlement_number: settlementNumber,
        quotation_id: quotation_id || null,
        invoice_id: invoice_id || null,
        supplier_id,
        buyer_id: buyer_id || null,
        commodity_name,
        grade_code,
        volume_kg: qty,
        selling_price_per_kg: price,
        total_buyer_payment: financials.totalRevenue,
        supplier_hpp_per_kg: hpp,
        total_supplier_hpp: financials.totalSupplierCost,
        packaging_cost: financials.totalPackagingCost,
        delivery_cost: financials.deliveryCost,
        gross_profit: financials.grossProfitIdr,
        gross_margin_pct: financials.grossMarginPct,
        net_supplier_payout: financials.totalSupplierCost,
        platform_net_profit: financials.grossProfitIdr,
        status: 'pending',
        notes,
      })
      .select('*, suppliers(*), buyers(*)')
      .single()

    if (error) {
      // If table not yet in schema cache, also insert/sync into purchase_orders as durable storage
      const poNumber = `PO/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Math.floor(1000 + Math.random() * 9000)}`
      const { data: po, error: poErr } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id,
          quotation_id: quotation_id || null,
          status: 'confirmed',
          total_amount: financials.totalSupplierCost,
          notes: notes || `Settlement SPK Maklon ${commodity_name}`,
        })
        .select('*')
        .single()

      if (poErr) {
        return NextResponse.json({ error: poErr.message }, { status: 500 })
      }

      return NextResponse.json({
        settlement: {
          id: po.id,
          settlement_number: `STL-${po.po_number}`,
          quotation_id,
          invoice_id,
          supplier_id,
          buyer_id,
          commodity_name,
          grade_code,
          volume_kg: qty,
          selling_price_per_kg: price,
          total_buyer_payment: financials.totalRevenue,
          supplier_hpp_per_kg: hpp,
          total_supplier_hpp: financials.totalSupplierCost,
          packaging_cost: financials.totalPackagingCost,
          delivery_cost: financials.deliveryCost,
          gross_profit: financials.grossProfitIdr,
          gross_margin_pct: financials.grossMarginPct,
          net_supplier_payout: financials.totalSupplierCost,
          platform_net_profit: financials.grossProfitIdr,
          status: 'approved',
          notes,
        },
      })
    }

    return NextResponse.json({ settlement: data })
  } catch (error) {
    console.error('Error creating settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
