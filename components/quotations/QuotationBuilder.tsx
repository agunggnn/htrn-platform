'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2 } from 'lucide-react'
import type { Buyer, Item, ItemGrade, Signatory } from '@/types'

type LineItem = {
  item_id: string
  grade_code: string
  quantity: string
  unit: string
  unit_price: string
  hs_code: string
  market_price: number | null
}

type Props = {
  buyers: Buyer[]
  items: Item[]
  grades: ItemGrade[]
  signatories: Signatory[]
  defaultBuyerId?: string
}

const EMPTY_LINE = (): LineItem => ({
  item_id: '', grade_code: '', quantity: '', unit: 'kg', unit_price: '', hs_code: '', market_price: null,
})

function calcSubtotal(lines: LineItem[]) {
  return lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0
    const price = parseFloat(l.unit_price) || 0
    return sum + qty * price
  }, 0)
}

export function QuotationBuilder({ buyers, items, grades, signatories, defaultBuyerId }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const validUntil = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  const [buyerId, setBuyerId] = useState(defaultBuyerId ?? '')
  const [date, setDate] = useState(today)
  const [validUntilDate, setValidUntilDate] = useState(validUntil)
  const [currency, setCurrency] = useState('USD')
  const [language, setLanguage] = useState('en')
  const [signatoryId, setSignatoryId] = useState(signatories.find((s) => s.is_default)?.id ?? '')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [taxRate, setTaxRate] = useState('0')
  const [lines, setLines] = useState<LineItem[]>([EMPTY_LINE()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedBuyer = buyers.find((b) => b.id === buyerId)

  useEffect(() => {
    if (selectedBuyer) {
      setCurrency(selectedBuyer.currency)
      setLanguage(selectedBuyer.language)
      setPaymentTerms(selectedBuyer.payment_terms ?? '')
    }
  }, [buyerId])

  async function fetchMarketPrice(itemId: string, gradeCode: string): Promise<number | null> {
    if (!itemId || !gradeCode) return null
    const supabase = createClient()
    const { data } = await supabase
      .from('price_history')
      .select('price_per_unit')
      .eq('item_id', itemId)
      .eq('grade_code', gradeCode)
      .order('price_date', { ascending: false })
      .limit(1)
      .single()
    return data?.price_per_unit ?? null
  }

  async function handleLineChange(idx: number, field: keyof LineItem, value: string) {
    const updated = lines.map((l, i) => i === idx ? { ...l, [field]: value } : l)

    if (field === 'item_id') {
      updated[idx].grade_code = ''
      updated[idx].market_price = null
      // auto-fill hs_code
      const item = items.find((it) => it.id === value)
      updated[idx].hs_code = item?.hs_code ?? ''
    }

    if (field === 'grade_code' || (field === 'item_id' && updated[idx].grade_code)) {
      const mp = await fetchMarketPrice(updated[idx].item_id, updated[idx].grade_code)
      updated[idx].market_price = mp
      if (mp && !updated[idx].unit_price) updated[idx].unit_price = String(mp)
    }

    setLines(updated)
  }

  const subtotal = calcSubtotal(lines)
  const taxAmount = subtotal * (parseFloat(taxRate) / 100)
  const total = subtotal + taxAmount

  const fmtCur = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)

  async function handleSave(status: 'draft' | 'sent') {
    if (!buyerId) { setError('Pilih buyer dulu'); return }
    const validLines = lines.filter((l) => l.item_id && l.grade_code && l.quantity && l.unit_price)
    if (validLines.length === 0) { setError('Tambah minimal satu item'); return }

    setSaving(true)
    setError('')
    const supabase = createClient()

    // Generate QUO number
    const { data: numData } = await supabase.rpc('next_quo_number')

    const { data: quo, error: quoErr } = await supabase
      .from('quotations')
      .insert({
        quo_number: numData,
        buyer_id: buyerId,
        date,
        valid_until: validUntilDate,
        currency,
        language,
        status,
        subtotal,
        tax_rate: parseFloat(taxRate),
        tax_amount: taxAmount,
        total_amount: total,
        payment_terms: paymentTerms,
        notes,
        internal_notes: internalNotes,
        signatory_id: signatoryId || null,
      })
      .select()
      .single()

    if (quoErr || !quo) { setError(quoErr?.message ?? 'Error'); setSaving(false); return }

    const lineRows = validLines.map((l, i) => ({
      quotation_id: quo.id,
      item_id: l.item_id,
      grade_code: l.grade_code,
      quantity: parseFloat(l.quantity),
      unit: l.unit,
      unit_price: parseFloat(l.unit_price),
      subtotal: parseFloat(l.quantity) * parseFloat(l.unit_price),
      hs_code: l.hs_code,
      country_of_origin: 'Indonesia',
      sort_order: i,
    }))

    const { error: lineErr } = await supabase.from('quotation_items').insert(lineRows)
    if (lineErr) { setError(lineErr.message); setSaving(false); return }

    router.push(`/quotations/${quo.id}`)
    router.refresh()
  }

  const T = language === 'id'
    ? { title: 'PENAWARAN HARGA', to: 'Kepada', desc: 'Deskripsi', qty: 'Jumlah', price: 'Harga Satuan', sub: 'Subtotal', tax: 'Pajak', total: 'Total' }
    : { title: 'QUOTATION', to: 'To', desc: 'Description', qty: 'Qty', price: 'Unit Price', sub: 'Subtotal', tax: 'Tax', total: 'Total' }

  return (
    <div className="flex gap-6">
      {/* Document preview — 2/3 */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {/* Letterhead placeholder */}
          <div className="flex items-center justify-between pb-6 border-b border-gray-100 mb-6">
            <div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: '#1a472a' }}>
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <p className="font-bold text-gray-900">Haturan</p>
              <p className="text-xs text-gray-400">Spice Export</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: '#1a472a' }}>{T.title}</p>
              <p className="text-xs text-gray-400 mt-1">Date: {date}</p>
              <p className="text-xs text-gray-400">Valid until: {validUntilDate}</p>
            </div>
          </div>

          {/* Buyer block */}
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{T.to}</p>
            {selectedBuyer ? (
              <div>
                <p className="font-semibold text-gray-900">{selectedBuyer.company_name}</p>
                {selectedBuyer.country && <p className="text-sm text-gray-500">{selectedBuyer.country}</p>}
                {selectedBuyer.email && <p className="text-sm text-gray-500">{selectedBuyer.email}</p>}
              </div>
            ) : (
              <p className="text-sm text-gray-300">— pilih buyer —</p>
            )}
          </div>

          {/* Line items */}
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left pb-2 text-xs font-semibold text-gray-700">{T.desc}</th>
                <th className="text-left pb-2 text-xs font-semibold text-gray-700 w-20">Grade</th>
                <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-20">{T.qty}</th>
                <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-28">{T.price}</th>
                <th className="text-right pb-2 text-xs font-semibold text-gray-700 w-28">{T.sub}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const itemGrades = grades.filter((g) => g.item_id === line.item_id)
                const selectedItem = items.find((it) => it.id === line.item_id)
                const lineSub = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)
                const margin = line.market_price && parseFloat(line.unit_price)
                  ? (((parseFloat(line.unit_price) - line.market_price) / line.market_price) * 100).toFixed(1)
                  : null

                return (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="py-2 pr-2">
                      <select
                        value={line.item_id}
                        onChange={(e) => handleLineChange(idx, 'item_id', e.target.value)}
                        className="w-full text-sm border-0 bg-gray-50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-700"
                      >
                        <option value="">— pilih rempah —</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {language === 'id' ? it.name : (it.name_en ?? it.name)}
                          </option>
                        ))}
                      </select>
                      {line.hs_code && <p className="text-xs text-gray-400 px-2 mt-0.5">HS: {line.hs_code}</p>}
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={line.grade_code}
                        onChange={(e) => handleLineChange(idx, 'grade_code', e.target.value)}
                        disabled={!line.item_id}
                        className="w-full text-sm border-0 bg-gray-50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-700 disabled:opacity-40"
                      >
                        <option value="">—</option>
                        {itemGrades.map((g) => <option key={g.grade_code} value={g.grade_code}>{g.grade_code}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, 'quantity', e.target.value)}
                          placeholder="0"
                          className="w-16 text-right text-sm border-0 bg-gray-50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-700"
                        />
                        <span className="text-xs text-gray-400">kg</span>
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => handleLineChange(idx, 'unit_price', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right text-sm border-0 bg-gray-50 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-700"
                      />
                      {margin !== null && (
                        <p className={`text-xs text-right px-2 mt-0.5 ${parseFloat(margin) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          margin {margin}%
                        </p>
                      )}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-700">
                      {lineSub > 0 ? fmtCur(lineSub) : '—'}
                    </td>
                    <td className="py-2 pl-2">
                      <button onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <button
            onClick={() => setLines([...lines, EMPTY_LINE()])}
            className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 mb-6"
          >
            <Plus className="w-4 h-4" /> Tambah item
          </button>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{fmtCur(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax ({taxRate}%)</span><span>{fmtCur(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                <span>{T.total}</span><span>{fmtCur(total)}</span>
              </div>
            </div>
          </div>

          {paymentTerms && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Payment Terms</p>
              <p className="text-sm text-gray-700">{paymentTerms}</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls panel — 1/3 */}
      <div className="w-72 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Pengaturan</h3>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buyer *</label>
            <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
              <option value="">— pilih buyer —</option>
              {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bahasa</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
                <option value="en">EN</option>
                <option value="id">ID</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
                {['USD', 'EUR', 'GBP', 'SGD', 'IDR'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Berlaku s/d</label>
              <input type="date" value={validUntilDate} onChange={(e) => setValidUntilDate(e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tax (%)</label>
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min="0" max="100"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>

          {signatories.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Penandatangan</label>
              <select value={signatoryId} onChange={(e) => setSignatoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
                <option value="">— pilih —</option>
                {signatories.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.title}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Payment Terms</label>
            <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. 30% DP, balance before shipment"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catatan (tampil di PDF)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Catatan Internal</label>
            <textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 resize-none" />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 px-1">{error}</p>}

        <div className="space-y-2">
          <button onClick={() => handleSave('draft')} disabled={saving}
            className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60">
            Simpan Draft
          </button>
          <button onClick={() => handleSave('sent')} disabled={saving}
            className="w-full py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: '#1a472a' }}>
            {saving ? 'Menyimpan...' : 'Tandai Terkirim'}
          </button>
        </div>
      </div>
    </div>
  )
}
