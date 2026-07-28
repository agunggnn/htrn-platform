'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2 } from 'lucide-react'
import type { Supplier, Item, ItemGrade, Quotation, Buyer } from '@/types'

type POLine = {
  item_id: string
  grade_code: string
  quantity_ordered: string
  unit: string
  unit_price: string
  last_price: string | null
}
type Props = {
  suppliers: Supplier[]
  items: Item[]
  grades: ItemGrade[]
  quotations: (Quotation & { buyers: Pick<Buyer, 'company_name'> | null })[]
  defaultQuoId?: string
}

const EMPTY_LINE = (): POLine => ({
  item_id: '',
  grade_code: '',
  quantity_ordered: '',
  unit: 'kg',
  unit_price: '',
  last_price: null,
})

export function POForm({ suppliers, items, grades, quotations, defaultQuoId }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [supplierId, setSupplierId] = useState('')
  const [quotationId, setQuotationId] = useState(defaultQuoId ?? '')
  const [orderDate, setOrderDate] = useState(today)
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<POLine[]>([EMPTY_LINE()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Auto-fill lines from selected quotation
  useEffect(() => {
    if (!quotationId) return
    const supabase = createClient()
    supabase
      .from('quotation_items')
      .select('*, items(name, hs_code)')
      .eq('quotation_id', quotationId)
      .then(({ data }) => {
        if (data?.length) {
          setLines(
            data.map((li) => ({
              item_id: li.item_id ?? '',
              grade_code: li.grade_code ?? '',
              quantity_ordered: String(li.quantity ?? ''),
              unit: li.unit ?? 'kg',
              unit_price: '',
              last_price: null,
            }))
          )
        }
      })
  }, [quotationId])

  async function fetchLastPrice(
    suppId: string,
    itemId: string,
    gradeCode: string
  ): Promise<string | null> {
    if (!suppId || !itemId || !gradeCode) return null
    const supabase = createClient()
    const { data } = await supabase
      .from('price_history')
      .select('price_per_unit, price_date')
      .eq('item_id', itemId)
      .eq('grade_code', gradeCode)
      .eq('supplier_id', suppId)
      .eq('source_type', 'supplier')
      .order('price_date', { ascending: false })
      .limit(1)
      .single()
    return data
      ? `${new Intl.NumberFormat('id-ID').format(data.price_per_unit)} (${data.price_date})`
      : null
  }

  async function handleLineChange(idx: number, field: keyof POLine, value: string) {
    const updated = lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l))

    if ((field === 'item_id' || field === 'grade_code') && supplierId) {
      const line = updated[idx]
      if (line.item_id && line.grade_code) {
        const lp = await fetchLastPrice(supplierId, line.item_id, line.grade_code)
        updated[idx].last_price = lp
      }
    }
    if (field === 'item_id') updated[idx].grade_code = ''

    setLines(updated)
  }

  async function handleSupplierChange(id: string) {
    setSupplierId(id)
    // Re-fetch last prices for all lines
    const updated = await Promise.all(
      lines.map(async (l) => {
        if (l.item_id && l.grade_code && id) {
          const lp = await fetchLastPrice(id, l.item_id, l.grade_code)
          return { ...l, last_price: lp }
        }
        return l
      })
    )
    setLines(updated)
  }

  const subtotal = lines.reduce(
    (s, l) => s + (parseFloat(l.quantity_ordered) || 0) * (parseFloat(l.unit_price) || 0),
    0
  )

  async function handleSave(status: 'draft' | 'sent') {
    if (!supplierId) {
      setError('Pilih supplier')
      return
    }
    const valid = lines.filter((l) => l.item_id && l.quantity_ordered)
    if (!valid.length) {
      setError('Tambah minimal satu item')
      return
    }

    setSaving(true)
    setError('')
    const supabase = createClient()

    const { data: numData } = await supabase.rpc('next_po_number')

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: numData,
        supplier_id: supplierId,
        quotation_id: quotationId || null,
        status,
        order_date: orderDate,
        expected_date: expectedDate || null,
        total_amount: subtotal,
        notes,
      })
      .select()
      .single()

    if (poErr || !po) {
      setError(poErr?.message ?? 'Error')
      setSaving(false)
      return
    }

    await supabase.from('po_items').insert(
      valid.map((l) => ({
        po_id: po.id,
        item_id: l.item_id || null,
        grade_code: l.grade_code,
        quantity_ordered: parseFloat(l.quantity_ordered),
        quantity_received: 0,
        unit: l.unit,
        unit_price: parseFloat(l.unit_price) || 0,
        subtotal: (parseFloat(l.quantity_ordered) || 0) * (parseFloat(l.unit_price) || 0),
      }))
    )

    router.push(`/purchase-orders/${po.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-500">Supplier *</label>
          <select
            value={supplierId}
            onChange={(e) => handleSupplierChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
          >
            <option value="">— pilih supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.region ? `· ${s.region}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Quotation Terkait (opsional)
          </label>
          <select
            value={quotationId}
            onChange={(e) => setQuotationId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
          >
            <option value="">— tidak ada —</option>
            {quotations.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quo_number} · {q.buyers?.company_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Tanggal Order</label>
          <input
            type="date"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Expected Delivery</label>
          <input
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Catatan</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instruksi pengiriman, spesifikasi..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
          />
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Item yang Dibeli</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Rempah</th>
              <th className="w-24 px-3 py-2.5 text-left text-xs font-semibold text-gray-500">
                Grade
              </th>
              <th className="w-28 px-3 py-2.5 text-left text-xs font-semibold text-gray-500">
                Qty (kg)
              </th>
              <th className="w-32 px-3 py-2.5 text-left text-xs font-semibold text-gray-500">
                Harga Beli (IDR)
              </th>
              <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold text-gray-500">
                Subtotal
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => {
              const itemGrades = grades.filter((g) => g.item_id === l.item_id)
              const sub = (parseFloat(l.quantity_ordered) || 0) * (parseFloat(l.unit_price) || 0)
              return (
                <tr key={idx} className="border-b border-gray-50">
                  <td className="px-4 py-2">
                    <select
                      value={l.item_id}
                      onChange={(e) => handleLineChange(idx, 'item_id', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-700 focus:outline-none"
                    >
                      <option value="">— pilih —</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={l.grade_code}
                      onChange={(e) => handleLineChange(idx, 'grade_code', e.target.value)}
                      disabled={!l.item_id}
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-700 focus:outline-none disabled:opacity-40"
                    >
                      <option value="">—</option>
                      {itemGrades.map((g) => (
                        <option key={g.grade_code} value={g.grade_code}>
                          {g.grade_code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={l.quantity_ordered}
                      onChange={(e) => handleLineChange(idx, 'quantity_ordered', e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-700 focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={l.unit_price}
                      onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-700 focus:outline-none"
                    />
                    {l.last_price && (
                      <p className="mt-0.5 px-1 text-xs text-blue-500">Terakhir: {l.last_price}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-700">
                    {sub > 0 ? `Rp ${new Intl.NumberFormat('id-ID').format(sub)}` : '—'}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-gray-50 px-4 py-3">
          <button
            onClick={() => setLines([...lines, EMPTY_LINE()])}
            className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800"
          >
            <Plus className="h-4 w-4" /> Tambah item
          </button>
          {subtotal > 0 && (
            <p className="text-sm font-bold text-gray-900">
              Total: Rp {new Intl.NumberFormat('id-ID').format(subtotal)}
            </p>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          Simpan Draft
        </button>
        <button
          onClick={() => handleSave('sent')}
          disabled={saving}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: '#1a472a' }}
        >
          {saving ? 'Menyimpan...' : 'Kirim ke Supplier'}
        </button>
      </div>
    </div>
  )
}
