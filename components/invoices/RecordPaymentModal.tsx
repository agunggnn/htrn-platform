'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = { invoiceId: string; amountDue: number; currency: string; onClose: () => void }

export function RecordPaymentModal({ invoiceId, amountDue, currency, onClose }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [amount, setAmount] = useState(String(amountDue))
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState('wire_transfer')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { setError('Masukkan jumlah pembayaran'); return }
    setSaving(true); setError('')
    const supabase = createClient()

    // Insert payment
    const { error: payErr } = await supabase.from('payments').insert({
      invoice_id: invoiceId,
      amount: parseFloat(amount),
      payment_date: date,
      method,
      reference_number: reference,
      notes,
    })
    if (payErr) { setError(payErr.message); setSaving(false); return }

    // Fetch current invoice to recalculate
    const { data: inv } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid')
      .eq('id', invoiceId)
      .single()

    if (inv) {
      const newPaid = (inv.amount_paid ?? 0) + parseFloat(amount)
      const newDue = (inv.total_amount ?? 0) - newPaid
      const newStatus = newDue <= 0 ? 'paid' : newPaid > 0 ? 'partial' : 'sent'
      await supabase.from('invoices').update({
        amount_paid: newPaid,
        amount_due: Math.max(0, newDue),
        status: newStatus,
      }).eq('id', invoiceId)
    }

    router.refresh()
    onClose()
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Catat Pembayaran</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah ({currency})</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
            <p className="text-xs text-gray-400 mt-1">Outstanding: {fmt(amountDue)}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Metode</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
              <option value="wire_transfer">Wire Transfer / T/T</option>
              <option value="lc">Letter of Credit (L/C)</option>
              <option value="cash">Cash</option>
              <option value="other">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nomor Referensi</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TT/REF-001"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ backgroundColor: '#1a472a' }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
