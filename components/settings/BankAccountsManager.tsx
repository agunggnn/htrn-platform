'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Star, Trash2 } from 'lucide-react'
import type { BankAccount } from '@/types'

type Props = { accounts: BankAccount[] }
const EMPTY = () => ({ bank_name: '', account_number: '', account_name: '', currency: 'IDR', is_primary: false })

export function BankAccountsManager({ accounts: initial }: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.bank_name || !form.account_number) { setError('Nama bank dan nomor rekening wajib'); return }
    setSaving(true); setError('')
    const supabase = createClient()

    if (form.is_primary) {
      await supabase.from('bank_accounts').update({ is_primary: false }).eq('is_primary', true)
    }

    const { error: err } = await supabase.from('bank_accounts').insert(form)
    if (err) { setError(err.message); setSaving(false); return }

    setForm(EMPTY()); setAdding(false); setSaving(false)
    router.refresh()
  }

  async function setPrimary(id: string) {
    const supabase = createClient()
    await supabase.from('bank_accounts').update({ is_primary: false }).neq('id', id)
    await supabase.from('bank_accounts').update({ is_primary: true }).eq('id', id)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('bank_accounts').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {accounts.map((acc) => (
        <div key={acc.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-gray-900">{acc.bank_name}</p>
              {acc.is_primary && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> Primary
                </span>
              )}
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">{acc.currency}</span>
            </div>
            <p className="text-sm text-gray-600">{acc.account_number}</p>
            <p className="text-xs text-gray-400">{acc.account_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {!acc.is_primary && (
              <button onClick={() => setPrimary(acc.id)} className="text-xs text-gray-500 hover:text-yellow-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-yellow-50">
                Set Primary
              </button>
            )}
            <button onClick={() => handleDelete(acc.id)} className="text-gray-300 hover:text-red-400 p-1.5">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Rekening Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            {([['Nama Bank *', 'bank_name', 'BCA / BNI / Mandiri...'], ['No. Rekening *', 'account_number', '1234567890'], ['Atas Nama', 'account_name', 'PT Haturan']]).map(([label, field, ph]: any) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input value={(form as any)[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700">
                {['IDR', 'USD', 'EUR', 'SGD'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_primary} onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))} />
            Jadikan rekening primary
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY()) }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60" style={{ backgroundColor: '#1a472a' }}>
              {saving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-green-700 border-2 border-dashed border-green-200 rounded-2xl hover:bg-green-50">
          <Plus className="w-4 h-4" /> Tambah Rekening
        </button>
      )}
    </div>
  )
}
