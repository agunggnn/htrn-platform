'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2 } from 'lucide-react'
import type { Supplier } from '@/types'

type Props = { suppliers: Supplier[] }
const EMPTY = (): Partial<Supplier> => ({
  name: '',
  contact_name: '',
  phone: '',
  region: '',
  specialties: '',
  notes: '',
})

export function SuppliersManager({ suppliers: initial }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Partial<Supplier>>(EMPTY())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(f: string, v: string) {
    setForm((p) => ({ ...p, [f]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) {
      setError('Nama supplier wajib')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    if (editing) {
      await supabase.from('suppliers').update(form).eq('id', editing)
      setEditing(null)
    } else {
      await supabase.from('suppliers').insert(form)
      setAdding(false)
    }
    setForm(EMPTY())
    setSaving(false)
    router.refresh()
  }

  function startEdit(s: Supplier) {
    setForm({
      name: s.name,
      contact_name: s.contact_name ?? '',
      phone: s.phone ?? '',
      region: s.region ?? '',
      specialties: s.specialties ?? '',
      notes: s.notes ?? '',
    })
    setEditing(s.id)
    setAdding(false)
  }

  const renderFormFields = () => {
    const fields = [
      ['Nama *', 'name', 'UD. Rempah Nusantara'],
      ['Kontak', 'contact_name', 'Pak Budi'],
      ['Telepon', 'phone', '+62 812 XXXX'],
      ['Wilayah', 'region', 'Maluku / Sulawesi'],
    ] as const

    return (
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([label, field, ph]) => (
          <div key={field}>
            <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
            <input
              value={form[field] ?? ''}
              onChange={(e) => set(field, e.target.value)}
              placeholder={ph}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Spesialisasi</label>
          <input
            value={form.specialties ?? ''}
            onChange={(e) => set('specialties', e.target.value)}
            placeholder="Cengkeh, Pala..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Catatan</label>
          <input
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {initial.map((s) => (
        <div key={s.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {editing === s.id ? (
            <form onSubmit={handleSave} className="space-y-3 p-5">
              {renderFormFields()}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setForm(EMPTY())
                  }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#1a472a' }}
                >
                  {saving ? '...' : 'Simpan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-semibold text-gray-900">{s.name}</p>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-400">
                  {s.region && <span>{s.region}</span>}
                  {s.contact_name && <span>{s.contact_name}</span>}
                  {s.phone && <span>{s.phone}</span>}
                  {s.specialties && <span className="text-green-600">{s.specialties}</span>}
                </div>
              </div>
              <button
                onClick={() => startEdit(s)}
                className="p-1.5 text-gray-400 hover:text-gray-600"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-gray-700">Supplier Baru</h3>
          {renderFormFields()}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setForm(EMPTY())
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: '#1a472a' }}
            >
              {saving ? '...' : 'Tambah'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-200 py-3 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          <Plus className="h-4 w-4" /> Tambah Supplier
        </button>
      )}
    </div>
  )
}
