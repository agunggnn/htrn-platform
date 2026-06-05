'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Star, Trash2 } from 'lucide-react'
import type { Signatory } from '@/types'

type Props = { signatories: Signatory[] }
const EMPTY = () => ({ name: '', title: '', is_default: false, signature_url: '' })

export function SignatoriesManager({ signatories: initial }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY())
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const supabase = createClient()
    const path = `signatures/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('company').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('company').getPublicUrl(path)
    setForm((f) => ({ ...f, signature_url: data.publicUrl }))
    setUploading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) { setError('Nama wajib diisi'); return }
    setSaving(true); setError('')
    const supabase = createClient()

    if (form.is_default) {
      await supabase.from('signatories').update({ is_default: false }).eq('is_default', true)
    }
    const { error: err } = await supabase.from('signatories').insert(form)
    if (err) { setError(err.message); setSaving(false); return }

    setForm(EMPTY()); setAdding(false); setSaving(false)
    router.refresh()
  }

  async function setDefault(id: string) {
    const supabase = createClient()
    await supabase.from('signatories').update({ is_default: false }).neq('id', id)
    await supabase.from('signatories').update({ is_default: true }).eq('id', id)
    router.refresh()
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('signatories').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {initial.map((s) => (
        <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {s.signature_url
              ? <img src={s.signature_url} alt="signature" className="h-10 object-contain bg-gray-50 rounded border border-gray-100 px-2" />
              : <div className="w-16 h-10 bg-gray-50 rounded border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-300">TTD</div>}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{s.name}</p>
                {s.is_default && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" /> Default
                  </span>
                )}
              </div>
              {s.title && <p className="text-xs text-gray-400">{s.title}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!s.is_default && (
              <button onClick={() => setDefault(s.id)} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-yellow-50 hover:text-yellow-600">
                Set Default
              </button>
            )}
            <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-400 p-1.5">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Penandatangan Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            {[['Nama *', 'name', 'John Doe'], ['Jabatan', 'title', 'Director']].map(([label, field, ph]: any) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input value={(form as any)[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Upload Tanda Tangan (PNG transparan)</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                {uploading ? 'Uploading...' : 'Pilih File'}
              </button>
              {form.signature_url && <img src={form.signature_url} alt="preview" className="h-8 object-contain" />}
            </div>
            <input ref={fileRef} type="file" accept="image/png" className="hidden" onChange={handleUpload} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))} />
            Jadikan penandatangan default
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
          <Plus className="w-4 h-4" /> Tambah Penandatangan
        </button>
      )}
    </div>
  )
}
