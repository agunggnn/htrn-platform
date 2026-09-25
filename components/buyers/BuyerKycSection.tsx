'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Phone,
  Search,
  ExternalLink,
  CheckCircle2,
  Building,
  Tag,
  Plus,
  Lock,
  Unlock,
} from 'lucide-react'
import { toast } from 'sonner'
import { parseBuyerKyc, type BuyerKycProfile, type KycStatus } from '@/lib/kyc-helper'
import type { Buyer } from '@/types'

type Props = {
  buyer: Buyer
}

export function BuyerKycSection({ buyer }: Props) {
  const [kyc, setKyc] = useState<BuyerKycProfile>(() => parseBuyerKyc(buyer))
  const [loadingGtc, setLoadingGtc] = useState(false)
  const [loadingSave, setLoadingSave] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')

  // Form states
  const [status, setStatus] = useState<KycStatus>(kyc.status)
  const [creditLimit, setCreditLimit] = useState<number>(kyc.creditLimit)
  const [allowedTerms, setAllowedTerms] = useState<string>(kyc.allowedTerms || 'CBD')
  const [taxId, setTaxId] = useState<string>(kyc.taxId || '')
  const [nib, setNib] = useState<string>(kyc.nib || '')

  // 1. One-click Getcontact Lookup
  async function handleGetcontactLookup() {
    if (!buyer.phone) {
      toast.error('Buyer belum memiliki nomor telepon untuk diverifikasi.')
      return
    }

    setLoadingGtc(true)
    try {
      const res = await fetch('/api/crm/getcontact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: buyer.phone,
          company_name: buyer.company_name,
          contact_name: buyer.contact_name,
          buyer_id: buyer.id,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal query Getcontact')
      }

      const data = json.data
      setKyc((prev) => ({
        ...prev,
        getcontactName: data.name || prev.getcontactName,
        getcontactTags: Array.from(new Set([...data.tags, ...prev.getcontactTags])),
        spamCount: data.spamCount,
        riskLevel: data.riskLevel,
        lastCheckedAt: new Date().toISOString().split('T')[0],
      }))

      toast.success(`Getcontact berhasil diperiksa: ${data.tags.length} tag ditemukan.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saat menghubungi Getcontact'
      toast.error(msg)
    } finally {
      setLoadingGtc(false)
    }
  }

  // 2. Add custom verified tag
  function handleAddTag() {
    if (!newTagInput.trim()) return
    const tag = newTagInput.trim()
    if (!kyc.getcontactTags.includes(tag)) {
      setKyc((prev) => ({
        ...prev,
        getcontactTags: [...prev.getcontactTags, tag],
      }))
      toast.success(`Tag "${tag}" ditambahkan ke profil verifikasi.`)
    }
    setNewTagInput('')
  }

  // 3. Save & Update KYC Decision
  async function handleSaveKyc() {
    setLoadingSave(true)
    try {
      const res = await fetch('/api/crm/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: buyer.id,
          status,
          credit_limit: creditLimit,
          allowed_terms: allowedTerms,
          tax_id: taxId,
          nib,
          verified_by: 'Agung Gunawan (Direktur PT Haturan Spice Indonesia)',
          getcontact_tags: kyc.getcontactTags,
          getcontact_name: kyc.getcontactName,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan status KYC')
      }

      setKyc(json.kyc)
      toast.success(`Status KYC ${buyer.company_name} berhasil disimpan: ${status.toUpperCase()}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saat menyimpan data KYC'
      toast.error(msg)
    } finally {
      setLoadingSave(false)
    }
  }

  const cleanPhone = buyer.phone ? buyer.phone.replace(/[^0-9+]/g, '') : null
  const webGtcUrl = cleanPhone ? `https://web.getcontact.com` : null

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Risk Posture */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          kyc.status === 'verified'
            ? 'bg-emerald-50/50 border-emerald-200'
            : kyc.status === 'rejected'
            ? 'bg-rose-50/50 border-rose-200'
            : 'bg-amber-50/40 border-amber-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {kyc.status === 'verified' ? (
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
            ) : kyc.status === 'rejected' ? (
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
                <ShieldX className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">
                  B2B KYC & Credit Risk Assessment
                </h3>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    kyc.status === 'verified'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : kyc.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {kyc.status === 'verified'
                    ? 'TERVERIFIKASI (VERIFIED)'
                    : kyc.status === 'rejected'
                    ? 'DITOLAK (REJECTED)'
                    : 'BELUM TERVERIFIKASI (PENDING)'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {kyc.status === 'verified'
                  ? `Diverifikasi oleh ${kyc.verifiedBy || 'Agung Gunawan'} pada ${kyc.verifiedAt || 'Baru ini'}. Plafon kredit aktif: Rp ${kyc.creditLimit.toLocaleString('id-ID')}`
                  : 'Pesanan terkunci pada syarat CBD (Cash Before Delivery). Selesaikan verifikasi nomor PIC dan legalitas untuk membuka opsi TOP 14/30 hari.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {kyc.status === 'verified' ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100/70 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
                <Unlock className="w-3.5 h-3.5" /> TOP Diizinkan
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100/70 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200">
                <Lock className="w-3.5 h-3.5" /> Terkunci CBD
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Personal Number Verification & Getcontact */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#1a472a]" />
              <h4 className="font-bold text-gray-900 text-sm">
                Verifikasi Nomor PIC (Getcontact Intelligence)
              </h4>
            </div>
            {kyc.lastCheckedAt && (
              <span className="text-[10px] text-gray-400">
                Diperiksa: {kyc.lastCheckedAt}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Nomor Telepon Terdaftar</p>
                <p className="font-bold text-gray-900 text-sm">{buyer.phone || 'Belum diisi'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {kyc.phoneOperator || 'GSM Operator'}
                  </span>
                  {kyc.isMobileWhatsapp && (
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      WhatsApp Capable
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={handleGetcontactLookup}
                  disabled={loadingGtc || !buyer.phone}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  style={{ backgroundColor: '#1a472a' }}
                >
                  <Search className="w-3.5 h-3.5" />
                  {loadingGtc ? 'Memeriksa...' : 'Cek Getcontact'}
                </button>
                {webGtcUrl && (
                  <a
                    href={webGtcUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 text-[10px] text-gray-500 hover:text-gray-900 font-medium py-0.5"
                  >
                    Buka Getcontact Web <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Caller Identity & Reputation */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                <p className="text-gray-400 text-[10px]">Identitas Pemilik Nomor</p>
                <p className="font-bold text-gray-900 mt-0.5">
                  {kyc.getcontactName || buyer.contact_name || 'Belum terverifikasi'}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {kyc.getcontactName?.toLowerCase().includes((buyer.contact_name || '').toLowerCase())
                    ? '✅ Nama cocok dengan data PIC'
                    : 'ℹ️ Cek kesesuaian nama PIC'}
                </p>
              </div>

              <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-100">
                <p className="text-gray-400 text-[10px]">Indikator Skor Spam & Risiko</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`font-bold ${
                      kyc.riskLevel === 'high'
                        ? 'text-rose-600'
                        : kyc.riskLevel === 'medium'
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {kyc.riskLevel === 'high' ? 'Tinggi' : kyc.riskLevel === 'medium' ? 'Sedang' : 'Rendah (Aman)'}
                  </span>
                  <span className="text-[10px] text-gray-400">({kyc.spamCount} laporan spam)</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {kyc.spamCount === 0 ? 'Bersih dari riwayat penipuan' : 'Perlu perhatian khusus'}
                </p>
              </div>
            </div>

            {/* Getcontact Tag Cloud */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-gray-500" />
                  Daftar Tag Getcontact ({kyc.getcontactTags.length})
                </p>
                <span className="text-[10px] text-gray-400">Bukti Reputasi Nomor</span>
              </div>

              {kyc.getcontactTags.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-400">
                  Belum ada tag Getcontact tersimpan. Klik tombol <strong>Cek Getcontact</strong> di atas.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-gray-50/50 rounded-xl border border-gray-100">
                  {kyc.getcontactTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white text-gray-800 border border-gray-200 rounded-lg shadow-2xs"
                    >
                      🏷️ {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Add manual tag */}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Tambah tag manual dari aplikasi Getcontact..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Tambah
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Legalitas Badan Usaha & Decision Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-[#1a472a]" />
              <h4 className="font-bold text-gray-900 text-sm">
                Legalitas Badan Usaha & Batas Kredit (Director Controls)
              </h4>
            </div>
            <span className="text-[10px] text-gray-400">PT Haturan Spice Indonesia</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* NPWP */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                NPWP Perusahaan (Tax ID)
              </label>
              <input
                type="text"
                placeholder="Contoh: 01.234.567.8-901.000"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
              />
            </div>

            {/* NIB */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Nomor Induk Berusaha (NIB)
              </label>
              <input
                type="text"
                placeholder="Contoh: 1234567890123"
                value={nib}
                onChange={(e) => setNib(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
              />
            </div>

            {/* Decision: Status KYC */}
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Keputusan Status KYC Buyer
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as KycStatus)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
              >
                <option value="unverified">⚪ Belum Terverifikasi (Kunci CBD)</option>
                <option value="pending">🟡 Dalam Tinjauan (Pending Review)</option>
                <option value="verified">🟢 Disetujui & Terverifikasi (Verified)</option>
                <option value="rejected">🔴 Ditolak / Blacklist</option>
              </select>
            </div>

            {/* Credit Limit & Allowed Terms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Plafon Kredit (IDR)
                </label>
                <input
                  type="number"
                  step="1000000"
                  placeholder="50000000"
                  value={creditLimit || ''}
                  onChange={(e) => setCreditLimit(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Syarat Bayar Diizinkan
                </label>
                <select
                  value={allowedTerms}
                  onChange={(e) => setAllowedTerms(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                >
                  <option value="CBD">CBD (Cash Before Delivery)</option>
                  <option value="COD">COD (Cash On Delivery)</option>
                  <option value="TOP 7 Hari">TOP 7 Hari (Setelah Sampel)</option>
                  <option value="TOP 14 Hari">TOP 14 Hari (Standard KYC)</option>
                  <option value="TOP 30 Hari">TOP 30 Hari (Enterprise/Industrial)</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveKyc}
                disabled={loadingSave}
                className="w-full py-2.5 px-4 text-xs font-bold text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                style={{ backgroundColor: '#1a472a' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {loadingSave ? 'Menyimpan...' : 'Simpan Verifikasi & Keputusan KYC'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
