'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CompanyProfile } from '@/types'

type Props = { company?: CompanyProfile | null }

export function CompanyForm({ company }: Props) {
  const [form, setForm] = useState({
    company_name: company?.company_name ?? '',
    tagline: company?.tagline ?? '',
    address: company?.address ?? '',
    phone: company?.phone ?? '',
    email: company?.email ?? '',
    website: company?.website ?? '',
    npwp: company?.npwp ?? '',
    primary_color: company?.primary_color ?? '#1a472a',
  })
  const [logoUrl, setLogoUrl] = useState(company?.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `logos/haturan-logo.${ext}`
    const { error: upErr } = await supabase.storage.from('company').upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('company').getPublicUrl(path)
    setLogoUrl(data.publicUrl)
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    const supabase = createClient()
    const payload = { ...form, logo_url: logoUrl || null }

    if (company?.id) {
      const { error: err } = await supabase.from('company_profile').update(payload).eq('id', company.id)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase.from('company_profile').insert(payload)
      if (err) { setError(err.message); setSaving(false); return }
    }
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Logo</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
            {logoUrl
              ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
              : <span className="text-xs text-gray-400">No logo</span>}
          </div>
          <div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              {uploading ? 'Mengupload...' : 'Upload Logo'}
            </button>
            <p className="text-xs text-gray-400 mt-1">PNG transparan, maks 2MB</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Informasi Perusahaan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            ['Nama Perusahaan *', 'company_name', 'text', 'PT Haturan Rempah Nusantara'],
            ['Tagline', 'tagline', 'text', 'Premium Indonesian Spice Exporter'],
            ['Telepon', 'phone', 'tel', '+62 21 XXXX XXXX'],
            ['Email', 'email', 'email', 'export@haturan.com'],
            ['Website', 'website', 'url', 'https://haturan.com'],
            ['NPWP', 'npwp', 'text', '00.000.000.0-000.000'],
          ] as [string, string, string, string][]).map(([label, field, type, placeholder]) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input type={type} value={(form as Record<string, string>)[field]}
                onChange={(e) => set(field, e.target.value)} placeholder={placeholder}
                className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Alamat</label>
            <textarea value={form.address} onChange={(e) => set('address', e.target.value)}
              placeholder="Jl. Raya Rempah No. 1, Jakarta..." rows={2}
              className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Warna Brand</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)}
                className="w-10 h-9 rounded border border-gray-200 cursor-pointer" />
              <input type="text" value={form.primary_color} onChange={(e) => set('primary_color', e.target.value)}
                className="flex-1 px-3.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Preview Kop Surat</h2>
        <div className="border border-gray-100 rounded-xl p-5 bg-gray-50">
          <div className="flex items-center justify-between pb-4 border-b-2" style={{ borderColor: form.primary_color }}>
            <div className="flex items-center gap-3">
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="h-10 object-contain" />
                : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: form.primary_color }}>H</div>}
              <div>
                <p className="font-bold text-gray-900 text-sm">{form.company_name || 'Nama Perusahaan'}</p>
                {form.tagline && <p className="text-xs text-gray-400">{form.tagline}</p>}
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 space-y-0.5">
              {form.phone && <p>{form.phone}</p>}
              {form.email && <p>{form.email}</p>}
              {form.website && <p>{form.website}</p>}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button type="submit" disabled={saving}
        className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
        style={{ backgroundColor: '#1a472a' }}>
        {saved ? '✓ Tersimpan' : saving ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  )
}
