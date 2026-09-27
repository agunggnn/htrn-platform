import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Handshake, Download } from 'lucide-react'
import { SettlementsTracker } from '@/components/reports/SettlementsTracker'
import { calculateFulfillmentFinancials } from '@/lib/fulfillment-helper'
import type {
  SupplierSettlement,
  SettlementStatus,
  Supplier,
  Quotation,
  Invoice,
  Buyer,
} from '@/types'

export const dynamic = 'force-dynamic'

export default async function SettlementsReportPage() {
  const supabase = await createClient()

  // 1. Fetch from supplier_settlements table
  const { data: tableData, error: tableErr } = await supabase
    .from('supplier_settlements')
    .select('*, suppliers(*), quotations(*), invoices(*), buyers(*)')
    .order('created_at', { ascending: false })

  let settlements: SupplierSettlement[] = []

  if (!tableErr && tableData && tableData.length > 0) {
    settlements = tableData as unknown as SupplierSettlement[]
  } else {
    // 2. Resilient dynamic resolution from purchase_orders + invoices + quotations
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
        .select('*, buyers(*), quotation_items(*)'),
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
      const sellingPrice =
        inv?.total_amount && volumeKg > 0
          ? Math.round(Number(inv.total_amount) / volumeKg)
          : 155000

      const financials = calculateFulfillmentFinancials(volumeKg, sellingPrice, supplierHpp)

      let status: SettlementStatus = 'pending'
      if (po.status === 'confirmed') status = 'approved'
      if (po.status === 'received') status = 'in_progress'

      settlements.push({
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
      })
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
  const avgGrossMarginPct =
    totalRevenue > 0 ? Number(((totalGrossProfit / totalRevenue) * 100).toFixed(1)) : 0
  const totalPendingPayout = settlements
    .filter((s) => s.status === 'pending' || s.status === 'approved' || s.status === 'in_progress')
    .reduce((s, it) => s + (Number(it.net_supplier_payout) || 0), 0)
  const totalSettledPayout = settlements
    .filter((s) => s.status === 'paid' || s.status === 'reconciled')
    .reduce((s, it) => s + (Number(it.net_supplier_payout) || 0), 0)

  const summary = {
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
  }

  return (
    <div className="px-6 py-8 lg:px-8">
      {/* Back Link */}
      <Link
        href="/reports"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Pusat Laporan
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Handshake className="h-7 w-7 text-[#1a472a]" />
            Settlement & Bagi Hasil Supplier
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Pelacakan realisasi arus kas pesanan, alokasi biaya pokok pengadaan (HPP Rp 125.000/kg),
            dan pencairan dana maklon Mas Parmin (Hub Sortasi Bogor).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export/purchase-orders"
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <Download className="h-4 w-4 text-gray-500" />
            Export Data PO (CSV)
          </a>
        </div>
      </div>

      {/* Interactive Settlements Tracker */}
      <SettlementsTracker initialSettlements={settlements} initialSummary={summary} />
    </div>
  )
}
