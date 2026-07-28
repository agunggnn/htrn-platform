'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
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
    const { error: upErr } = await supabase.storage
      .from('company')
      .upload(path, file, { upsert: true })
    if (upErr) {
      setError(upErr.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('company').getPublicUrl(path)
    setLogoUrl(data.publicUrl)
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    const supabase = createClient()
    const payload = { ...form, logo_url: logoUrl || null }

    if (company?.id) {
      const { error: err } = await supabase
        .from('company_profile')
        .update(payload)
        .eq('id', company.id)
      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
    } else {
      const { error: err } = await supabase.from('company_profile').insert(payload)
      if (err) {
        setError(err.message)
        setSaving(false)
        return
      }
    }
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Logo */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Logo</h2>
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo perusahaan"
                width={80}
                height={80}
                unoptimized
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-xs text-gray-400">No logo</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              {uploading ? 'Mengupload...' : 'Upload Logo'}
            </button>
            <p className="mt-1 text-xs text-gray-400">PNG transparan, maks 2MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Informasi Perusahaan</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(
            [
              ['Nama Perusahaan *', 'company_name', 'text', 'PT Haturan Rempah Nusantara'],
              ['Tagline', 'tagline', 'text', 'Premium Indonesian Spice Exporter'],
              ['Telepon', 'phone', 'tel', '+62 21 XXXX XXXX'],
              ['Email', 'email', 'email', 'export@haturan.com'],
              ['Website', 'website', 'url', 'https://haturan.com'],
              ['NPWP', 'npwp', 'text', '00.000.000.0-000.000'],
            ] as [string, string, string, string][]
          ).map(([label, field, type, placeholder]) => (
            <div key={field}>
              <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
              <input
                type={type}
                value={(form as Record<string, string>)[field]}
                onChange={(e) => set(field, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
              />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Jl. Raya Rempah No. 1, Jakarta..."
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 px-3.5 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Warna Brand</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => set('primary_color', e.target.value)}
                className="h-9 w-10 cursor-pointer rounded border border-gray-200"
              />
              <input
                type="text"
                value={form.primary_color}
                onChange={(e) => set('primary_color', e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3.5 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Preview Kop Surat</h2>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div
            className="flex items-center justify-between border-b-2 pb-4"
            style={{ borderColor: form.primary_color }}
          >
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={100}
                  height={40}
                  unoptimized
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: form.primary_color }}
                >
                  H
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {form.company_name || 'Nama Perusahaan'}
                </p>
                {form.tagline && <p className="text-xs text-gray-400">{form.tagline}</p>}
              </div>
            </div>
            <div className="space-y-0.5 text-right text-xs text-gray-500">
              {form.phone && <p>{form.phone}</p>}
              {form.email && <p>{form.email}</p>}
              {form.website && <p>{form.website}</p>}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: '#1a472a' }}
      >
        {saved ? '✓ Tersimpan' : saving ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  )
}
