'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Plus } from 'lucide-react'
import type { Buyer, Signatory } from '@/types'

type LineItem = { description: string; grade_code: string; quantity: string; unit: string; unit_price: string; hs_code: string }
type Props = { buyers: Buyer[]; signatories: Signatory[]; prefill?: any }

const EMPTY_LINE = (): LineItem => ({ description: '', grade_code: '', quantity: '', unit: 'kg', unit_price: '', hs_code: '' })

export function InvoiceForm({ buyers, signatories, prefill }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const due30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const [buyerId, setBuyerId] = useState(prefill?.buyer_id ?? '')
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState(due30)
  const [currency, setCurrency] = useState(prefill?.currency ?? 'USD')
  const [exchangeRate, setExchangeRate] = useState('1')
  const [language, setLanguage] = useState(prefill?.language ?? 'en')
  const [taxRate, setTaxRate] = useState(String(prefill?.tax_rate ?? '0'))
  const [paymentTerms, setPaymentTerms] = useState(prefill?.payment_terms ?? '')
  const [notes, setNotes] = useState(prefill?.notes ?? '')
  const [signatoryId, setSignatoryId] = useState(signatories.find((s) => s.is_default)?.id ?? '')
  const [lines, setLines] = useState<LineItem[]>(() => {
    if (prefill?.quotation_items?.length) {
      return prefill.quotation_items.map((li: any) => ({
        description: language === 'id' ? li.items?.name : (li.items?.name_en ?? li.items?.name ?? ''),
        grade_code: li.grade_code ?? '',
        quantity: String(li.quantity ?? ''),
        unit: li.unit ?? 'kg',
        unit_price: String(li.unit_price ?? ''),
        hs_code: li.hs_code ?? li.items?.hs_code ?? '',
      }))
    }
    return [EMPTY_LINE()]
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0)
  const taxAmount = subtotal * (parseFloat(taxRate) / 100)
  const total = subtotal + taxAmount

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)

  async function handleSave(status: 'draft' | 'sent') {
    if (!buyerId) { setError('Pilih buyer'); return }
    const valid = lines.filter((l) => l.description && l.quantity && l.unit_price)
    if (!valid.length) { setError('Tambah minimal satu item'); return }

    setSaving(true); setError('')
    const supabase = createClient()

    const { data: numData } = await supabase.rpc('next_inv_number')

    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        inv_number: numData,
        quotation_id: prefill?.id ?? null,
        buyer_id: buyerId,
        issue_date: issueDate,
        due_date: dueDate,
        currency,
        exchange_rate: parseFloat(exchangeRate),
        language,
        status,
        subtotal,
        tax_rate: parseFloat(taxRate),
        tax_amount: taxAmount,
        total_amount: total,
        amount_paid: 0,
        amount_due: total,
        payment_terms: paymentTerms,
        notes,
        signatory_id: signatoryId || null,
      })
      .select().single()

    if (invErr || !inv) { setError(invErr?.message ?? 'Error'); setSaving(false); return }

    await supabase.from('invoice_items').insert(
      valid.map((l, i) => ({
        invoice_id: inv.id,
        item_id: null,
        grade_code: l.grade_code,
        description: l.description,
        quantity: parseFloat(l.quantity),
        unit: l.unit,
        unit_price: parseFloat(l.unit_price),
        subtotal: parseFloat(l.quantity) * parseFloat(l.unit_price),
        hs_code: l.hs_code,
        country_of_origin: 'Indonesia',
        sort_order: i,
      }))
    )

    router.push(`/invoices/${inv.id}`)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Header fields */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Buyer *</label>
          <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
            <option value="">— pilih buyer —</option>
            {buyers.map((b) => <option key={b.id} value={b.id}>{b.company_name}</option>)}
          </select>
        </div>
        {[
          ['Tanggal Invoice', issueDate, setIssueDate, 'date'],
          ['Jatuh Tempo', dueDate, setDueDate, 'date'],
        ].map(([label, val, setter, type]: any) => (
          <div key={label}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <input type={type} value={val} onChange={(e: any) => setter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
            {['USD', 'EUR', 'GBP', 'SGD', 'IDR'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        {currency !== 'IDR' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kurs ke IDR</label>
            <input type="number" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Bahasa</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
            <option value="en">English</option>
            <option value="id">Indonesia</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tax (%)</label>
          <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min="0"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
        </div>
        {signatories.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Penandatangan</label>
            <select value={signatoryId} onChange={(e) => setSignatoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
              <option value="">— pilih —</option>
              {signatories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Item</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Deskripsi</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 w-20">Grade</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 w-24">Qty (kg)</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 w-28">Harga ({currency})</th>
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 w-20">HS Code</th>
              <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500 w-28">Subtotal</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
              <tr key={idx} className="border-b border-gray-50">
                <td className="px-4 py-2">
                  <input value={l.description} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                    placeholder="Cloves / Cengkeh..."
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-700" />
                </td>
                <td className="px-3 py-2">
                  <input value={l.grade_code} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, grade_code: e.target.value } : x))}
                    placeholder="A"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-700" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={l.quantity} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-700" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={l.unit_price} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, unit_price: e.target.value } : x))}
                    placeholder="0.00"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-700" />
                </td>
                <td className="px-3 py-2">
                  <input value={l.hs_code} onChange={(e) => setLines(lines.map((x, i) => i === idx ? { ...x, hs_code: e.target.value } : x))}
                    placeholder="0907"
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-700" />
                </td>
                <td className="px-3 py-2 text-right font-medium text-gray-700">
                  {(parseFloat(l.quantity) * parseFloat(l.unit_price)) > 0
                    ? fmt(parseFloat(l.quantity) * parseFloat(l.unit_price))
                    : '—'}
                </td>
                <td className="px-2 py-2">
                  <button onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-50">
          <button onClick={() => setLines([...lines, EMPTY_LINE()])}
            className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800">
            <Plus className="w-4 h-4" /> Tambah item
          </button>
        </div>
        {/* Totals */}
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
          <div className="w-56 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {parseFloat(taxRate) > 0 && <div className="flex justify-between text-gray-500"><span>Tax ({taxRate}%)</span><span>{fmt(taxAmount)}</span></div>}
            {currency !== 'IDR' && exchangeRate !== '1' && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Equiv. IDR</span>
                <span>Rp {new Intl.NumberFormat('id-ID').format(Math.round(total * parseFloat(exchangeRate)))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
              <span>Total</span><span>{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Payment Terms</label>
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button onClick={() => handleSave('draft')} disabled={saving}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60">
          Simpan Draft
        </button>
        <button onClick={() => handleSave('sent')} disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
          style={{ backgroundColor: '#1a472a' }}>
          {saving ? 'Menyimpan...' : 'Kirim Invoice'}
        </button>
      </div>
    </div>
  )
}
