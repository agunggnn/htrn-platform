'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const path = `signatures/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from('company')
      .upload(path, file, { upsert: true })
    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('company').getPublicUrl(path)
    setForm((f) => ({ ...f, signature_url: data.publicUrl }))
    setUploading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name) {
      setError('Nama wajib diisi')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()

    if (form.is_default) {
      await supabase.from('signatories').update({ is_default: false }).eq('is_default', true)
    }
    const { error: err } = await supabase.from('signatories').insert(form)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    setForm(EMPTY())
    setAdding(false)
    setSaving(false)
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
        <div
          key={s.id}
          className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5"
        >
          <div className="flex items-center gap-4">
            {s.signature_url ? (
              <Image
                src={s.signature_url}
                alt={`Tanda tangan ${s.name}`}
                width={64}
                height={40}
                unoptimized
                className="h-10 w-16 rounded border border-gray-100 bg-gray-50 object-contain px-2"
              />
            ) : (
              <div className="flex h-10 w-16 items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-300">
                TTD
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{s.name}</p>
                {s.is_default && (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-700">
                    <Star className="h-3 w-3" /> Default
                  </span>
                )}
              </div>
              {s.title && <p className="text-xs text-gray-400">{s.title}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!s.is_default && (
              <button
                onClick={() => setDefault(s.id)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-yellow-50 hover:text-yellow-600"
              >
                Set Default
              </button>
            )}
            <button
              onClick={() => handleDelete(s.id)}
              className="p-1.5 text-gray-300 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <form
          onSubmit={handleAdd}
          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-gray-700">Penandatangan Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['Nama *', 'name', 'John Doe'],
                ['Jabatan', 'title', 'Director'],
              ] as const
            ).map(([label, field, ph]) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
                <input
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Upload Tanda Tangan (PNG transparan)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {uploading ? 'Uploading...' : 'Pilih File'}
              </button>
              {form.signature_url && (
                <Image
                  src={form.signature_url}
                  alt="Pratinjau tanda tangan"
                  width={128}
                  height={32}
                  unoptimized
                  className="h-8 w-auto object-contain"
                />
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            />
            Jadikan penandatangan default
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setForm(EMPTY())
              }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#1a472a' }}
            >
              {saving ? 'Menyimpan...' : 'Tambah'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-200 py-3 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          <Plus className="h-4 w-4" /> Tambah Penandatangan
        </button>
      )}
    </div>
  )
}
