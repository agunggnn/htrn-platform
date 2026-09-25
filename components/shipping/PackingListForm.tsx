'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Save, Printer, ArrowLeft, Package, Ship } from 'lucide-react'
import Link from 'next/link'
import type { InvoiceItem, PackingList, PackingListItem } from '@/types'

type PackingListFormProps = {
  invoiceId: string
  invNumber: string | null
  existingPL: PackingList | null
  existingItems: PackingListItem[]
  invoiceItems: InvoiceItem[]
}

export function PackingListForm({
  invoiceId,
  invNumber,
  existingPL,
  existingItems,
  invoiceItems,
}: PackingListFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [vesselName, setVesselName] = useState(existingPL?.vessel_name ?? '')
  const [portOfLoading, setPortOfLoading] = useState(
    existingPL?.port_of_loading ?? 'Tanjung Priok, Jakarta, Indonesia'
  )
  const [portOfDestination, setPortOfDestination] = useState(
    existingPL?.port_of_destination ?? ''
  )
  const [containerNumber, setContainerNumber] = useState(
    existingPL?.container_number ?? ''
  )
  const [sealNumber, setSealNumber] = useState(existingPL?.seal_number ?? '')
  const [shippingMarks, setShippingMarks] = useState(
    existingPL?.shipping_marks ??
      `HATURAN TRADE\nJAKARTA - INDONESIA\nMADE IN INDONESIA`
  )

  // Initialize packing list items from existing or auto-calculate from invoice items
  const [items, setItems] = useState<
    Array<{
      invoiceItemId: string | null
      description: string
      packages: number
      netWeightPerPkg: number
      grossWeightPerPkg: number
      totalNetWeight: number
      totalGrossWeight: number
    }>
  >(() => {
    if (existingItems.length > 0) {
      return existingItems.map((i) => ({
        invoiceItemId: i.invoice_item_id,
        description: i.description,
        packages: i.packages,
        netWeightPerPkg: i.net_weight_per_package,
        grossWeightPerPkg: i.gross_weight_per_package,
        totalNetWeight: i.total_net_weight,
        totalGrossWeight: i.total_gross_weight,
      }))
    }
    return invoiceItems.map((l) => {
      const qty = l.quantity ?? 0
      const pkgs = Math.ceil(qty / 25) || 1
      const netPerPkg = qty / pkgs
      const grossPerPkg = Number((netPerPkg + 0.5).toFixed(2))
      return {
        invoiceItemId: l.id,
        description: l.description,
        packages: pkgs,
        netWeightPerPkg: Number(netPerPkg.toFixed(2)),
        grossWeightPerPkg: grossPerPkg,
        totalNetWeight: qty,
        totalGrossWeight: Number((pkgs * grossPerPkg).toFixed(2)),
      }
    })
  })

  const updateItem = (
    index: number,
    field: 'packages' | 'netWeightPerPkg' | 'grossWeightPerPkg',
    val: number
  ) => {
    setItems((prev) => {
      const next = [...prev]
      const curr = { ...next[index] }
      if (field === 'packages') curr.packages = val
      if (field === 'netWeightPerPkg') curr.netWeightPerPkg = val
      if (field === 'grossWeightPerPkg') curr.grossWeightPerPkg = val

      curr.totalNetWeight = Number((curr.packages * curr.netWeightPerPkg).toFixed(2))
      curr.totalGrossWeight = Number((curr.packages * curr.grossWeightPerPkg).toFixed(2))
      next[index] = curr
      return next
    })
  }

  const totalPackages = items.reduce((s, i) => s + (i.packages || 0), 0)
  const totalNetWeight = items.reduce((s, i) => s + (i.totalNetWeight || 0), 0)
  const totalGrossWeight = items.reduce((s, i) => s + (i.totalGrossWeight || 0), 0)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    try {
      const supabase = createClient()

      const plPayload = {
        invoice_id: invoiceId,
        vessel_name: vesselName || null,
        port_of_loading: portOfLoading || null,
        port_of_destination: portOfDestination || null,
        container_number: containerNumber || null,
        seal_number: sealNumber || null,
        shipping_marks: shippingMarks || null,
        total_packages: totalPackages,
        total_net_weight: totalNetWeight,
        total_gross_weight: totalGrossWeight,
      }

      let plId = existingPL?.id

      if (plId) {
        const { error: plErr } = await supabase
          .from('packing_lists')
          .update(plPayload)
          .eq('id', plId)
        if (plErr) throw plErr
      } else {
        const { data: newPL, error: plErr } = await supabase
          .from('packing_lists')
          .insert(plPayload)
          .select('id')
          .single()
        if (plErr) throw plErr
        plId = newPL.id
      }

      // Re-insert line items
      if (plId) {
        await supabase.from('packing_list_items').delete().eq('packing_list_id', plId)

        const itemPayloads = items.map((i, idx) => ({
          packing_list_id: plId,
          invoice_item_id: i.invoiceItemId,
          description: i.description,
          packages: i.packages,
          net_weight_per_package: i.netWeightPerPkg,
          gross_weight_per_package: i.grossWeightPerPkg,
          total_net_weight: i.totalNetWeight,
          total_gross_weight: i.totalGrossWeight,
          sort_order: idx,
        }))

        const { error: itemsErr } = await supabase
          .from('packing_list_items')
          .insert(itemPayloads)
        if (itemsErr) throw itemsErr
      }

      setMsg({ type: 'success', text: 'Packing List berhasil disimpan!' })
      router.refresh()
    } catch (err: unknown) {
      const e = err as Error
      setMsg({ type: 'error', text: e.message || 'Gagal menyimpan Packing List' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/invoices/${invoiceId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Detail Invoice
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={`/api/pdf/packing-list/${invoiceId}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" /> Cetak PDF
          </a>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#1a472a' }}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Packing List'}
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-sm border ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Shipment Info Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <Ship className="w-5 h-5 text-[#1a472a]" />
          <h2 className="text-base font-bold text-gray-900">
            Informasi Pengiriman (Shipping Details) — Invoice {invNumber}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Vessel / Kapal / Carrier
            </label>
            <input
              type="text"
              value={vesselName}
              onChange={(e) => setVesselName(e.target.value)}
              placeholder="e.g. MV SPICE EXPRESS V.02"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Port of Loading (Pelabuhan Muat)
            </label>
            <input
              type="text"
              value={portOfLoading}
              onChange={(e) => setPortOfLoading(e.target.value)}
              placeholder="Tanjung Priok, Jakarta, Indonesia"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Port of Destination (Pelabuhan Tujuan)
            </label>
            <input
              type="text"
              value={portOfDestination}
              onChange={(e) => setPortOfDestination(e.target.value)}
              placeholder="e.g. Port of Rotterdam, Netherlands"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              No. Kontainer
            </label>
            <input
              type="text"
              value={containerNumber}
              onChange={(e) => setContainerNumber(e.target.value)}
              placeholder="e.g. TGHU1234567"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              No. Segel (Seal Number)
            </label>
            <input
              type="text"
              value={sealNumber}
              onChange={(e) => setSealNumber(e.target.value)}
              placeholder="e.g. SL987654"
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Shipping Marks & Numbers (Marking Kemasan)
            </label>
            <textarea
              rows={3}
              value={shippingMarks}
              onChange={(e) => setShippingMarks(e.target.value)}
              placeholder="Tuliskan tanda marking karung/kemasan ekspor..."
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
            />
          </div>
        </div>
      </div>

      {/* Items Package & Weight Calculator */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#1a472a]" />
            <h2 className="text-base font-bold text-gray-900">
              Rincian Kemasan, Berat Bersih & Berat Kotor
            </h2>
          </div>
          <span className="text-xs text-gray-400">{items.length} item</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                <th className="px-5 py-3 text-left">Deskripsi Produk</th>
                <th className="px-4 py-3 text-center w-28">Jumlah Karung / Bag</th>
                <th className="px-4 py-3 text-right w-36">Net Wt / Bag (kg)</th>
                <th className="px-4 py-3 text-right w-36">Gross Wt / Bag (kg)</th>
                <th className="px-4 py-3 text-right w-36">Total Net (kg)</th>
                <th className="px-5 py-3 text-right w-36">Total Gross (kg)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{item.description}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      value={item.packages}
                      onChange={(e) =>
                        updateItem(idx, 'packages', parseInt(e.target.value) || 1)
                      }
                      className="w-full text-center px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.netWeightPerPkg}
                      onChange={(e) =>
                        updateItem(idx, 'netWeightPerPkg', parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-right px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.01"
                      value={item.grossWeightPerPkg}
                      onChange={(e) =>
                        updateItem(idx, 'grossWeightPerPkg', parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-right px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 font-mono">
                    {item.totalNetWeight} kg
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900 font-mono">
                    {item.totalGrossWeight} kg
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                <td className="px-5 py-3.5">TOTAL AKUMULASI</td>
                <td className="px-4 py-3.5 text-center">{totalPackages} Bag(s)</td>
                <td className="px-4 py-3.5 text-right">—</td>
                <td className="px-4 py-3.5 text-right">—</td>
                <td className="px-4 py-3.5 text-right text-[#1a472a] font-mono">
                  {totalNetWeight} kg
                </td>
                <td className="px-5 py-3.5 text-right text-[#1a472a] font-mono">
                  {totalGrossWeight} kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </form>
  )
}
