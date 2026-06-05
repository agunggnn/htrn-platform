'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Buyer } from '@/types'

type Props = { buyer?: Buyer }

const PAYMENT_TERMS = ['Prepaid', '30% DP', 'Net 30', 'Net 60', 'Net 90', 'L/C']
const SOURCES = ['website', 'referral', 'trade_show', 'cold_outreach', 'other']

export function BuyerForm({ buyer }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    company_name: buyer?.company_name ?? '',
    contact_name: buyer?.contact_name ?? '',
    email: buyer?.email ?? '',
    phone: buyer?.phone ?? '',
    country: buyer?.country ?? '',
    currency: buyer?.currency ?? 'USD',
    language: buyer?.language ?? 'en',
    payment_terms: buyer?.payment_terms ?? '',
    tax_id: buyer?.tax_id ?? '',
    source: buyer?.source ?? '',
    notes: buyer?.notes ?? '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) { setError('Nama perusahaan wajib diisi'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()

    if (buyer) {
      const { error: err } = await supabase.from('buyers').update(form).eq('id', buyer.id)
      if (err) { setError(err.message); setSaving(false); return }
      router.push(`/buyers/${buyer.id}`)
    } else {
      const { data, error: err } = await supabase.from('buyers').insert(form).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      router.push(`/buyers/${data.id}`)
    }
    router.refresh()
  }

  const field = (label: string, name: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={(form as Record<string, string>)[name]}
        onChange={(e) => set(name, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Informasi Perusahaan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Nama Perusahaan *', 'company_name', 'text', 'PT / Ltd. / Co.')}
          {field('Nama Kontak', 'contact_name', 'text', 'John Doe')}
          {field('Email', 'email', 'email', 'contact@company.com')}
          {field('Telepon', 'phone', 'tel', '+1 234 567 890')}
          {field('Negara', 'country', 'text', 'United States')}
          {field('Tax ID / NPWP', 'tax_id', 'text')}
        </div>
      </div>

      {/* Trade info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Preferensi Perdagangan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
              {['USD', 'EUR', 'GBP', 'SGD', 'IDR'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bahasa Dokumen</label>
            <select value={form.language} onChange={(e) => set('language', e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
              <option value="en">English</option>
              <option value="id">Indonesia</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
            <select value={form.payment_terms} onChange={(e) => set('payment_terms', e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
              <option value="">— pilih —</option>
              {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sumber</label>
            <select value={form.source} onChange={(e) => set('source', e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
              <option value="">— pilih —</option>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Catatan</h2>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={4}
          placeholder="Catatan tentang buyer ini..."
          className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Batal
        </button>
        <button type="submit" disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
          style={{ backgroundColor: '#1a472a' }}>
          {saving ? 'Menyimpan...' : buyer ? 'Simpan Perubahan' : 'Tambah Buyer'}
        </button>
      </div>
    </form>
  )
}
