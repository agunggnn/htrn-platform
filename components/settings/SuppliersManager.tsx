'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, X } from 'lucide-react'
import type { Supplier } from '@/types'

type Props = { suppliers: Supplier[] }
const EMPTY = (): Partial<Supplier> => ({ name: '', contact_name: '', phone: '', region: '', specialties: '', notes: '' })

export function SuppliersManager({ suppliers: initial }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Partial<Supplier>>(EMPTY())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { setError('Nama supplier wajib'); return }
    setSaving(true); setError('')
    const supabase = createClient()

    if (editing) {
      await supabase.from('suppliers').update(form).eq('id', editing)
      setEditing(null)
    } else {
      await supabase.from('suppliers').insert(form)
      setAdding(false)
    }
    setForm(EMPTY()); setSaving(false)
    router.refresh()
  }

  function startEdit(s: Supplier) {
    setForm({ name: s.name, contact_name: s.contact_name ?? '', phone: s.phone ?? '', region: s.region ?? '', specialties: s.specialties ?? '', notes: s.notes ?? '' })
    setEditing(s.id); setAdding(false)
  }

  const FormFields = () => (
    <div className="grid grid-cols-2 gap-3">
      {[['Nama *', 'name', 'UD. Rempah Nusantara'], ['Kontak', 'contact_name', 'Pak Budi'], ['Telepon', 'phone', '+62 812 XXXX'], ['Wilayah', 'region', 'Maluku / Sulawesi']].map(([label, field, ph]: any) => (
        <div key={field}>
          <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
          <input value={(form as any)[field] ?? ''} onChange={(e) => set(field, e.target.value)} placeholder={ph}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
        </div>
      ))}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Spesialisasi</label>
        <input value={form.specialties ?? ''} onChange={(e) => set('specialties', e.target.value)} placeholder="Cengkeh, Pala..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Catatan</label>
        <input value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      {initial.map((s) => (
        <div key={s.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {editing === s.id ? (
            <form onSubmit={handleSave} className="p-5 space-y-3">
              <FormFields />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditing(null); setForm(EMPTY()) }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg">Batal</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: '#1a472a' }}>
                  {saving ? '...' : 'Simpan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-semibold text-gray-900">{s.name}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {s.region && <span>{s.region}</span>}
                  {s.contact_name && <span>{s.contact_name}</span>}
                  {s.phone && <span>{s.phone}</span>}
                  {s.specialties && <span className="text-green-600">{s.specialties}</span>}
                </div>
              </div>
              <button onClick={() => startEdit(s)} className="text-gray-400 hover:text-gray-600 p-1.5">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Supplier Baru</h3>
          <FormFields />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY()) }} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg">Batal</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ backgroundColor: '#1a472a' }}>
              {saving ? '...' : 'Tambah'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-green-700 border-2 border-dashed border-green-200 rounded-2xl hover:bg-green-50">
          <Plus className="w-4 h-4" /> Tambah Supplier
        </button>
      )}
    </div>
  )
}
