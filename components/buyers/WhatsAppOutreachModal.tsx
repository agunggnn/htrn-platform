'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  X,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Phone,
  PhoneOff,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  WHATSAPP_SCRIPT_OPTIONS,
  type WhatsAppScriptType,
  getWhatsAppPitchText,
  cleanWhatsAppNumber,
  formatDisplayPhoneNumber,
  buildWhatsAppDirectUrl,
} from '@/lib/whatsapp-pitch-helper'
import {
  getWhatsAppVerificationInfo,
  type WhatsAppStatus,
} from '@/lib/buyers-helper'
import type { Buyer } from '@/types'

type Props = {
  isOpen: boolean
  onClose: () => void
  buyer: Buyer | null
  onStatusUpdated?: (buyerId: string, status: string) => void
}

export function WhatsAppOutreachModal(props: Props) {
  if (!props.isOpen || !props.buyer) return null
  return <WhatsAppOutreachModalContent key={`${props.buyer.id}`} {...props} buyer={props.buyer} />
}

function WhatsAppOutreachModalContent({
  onClose,
  buyer,
  onStatusUpdated,
}: {
  onClose: () => void
  buyer: Buyer
  onStatusUpdated?: (buyerId: string, status: string) => void
}) {
  const initialInfo = useMemo(() => getWhatsAppVerificationInfo(buyer), [buyer])
  const [selectedScript, setSelectedScript] = useState<WhatsAppScriptType>('sample_offer')
  const [customText, setCustomText] = useState<string | null>(null)
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)
  const [waStatus, setWaStatus] = useState<WhatsAppStatus>(initialInfo.status)
  const [activeDocs, setActiveDocs] = useState<
    {
      id: string
      doc_type: string
      title: string
      generated_route?: string | null
      supporting_file_url?: string | null
      is_verified?: boolean
    }[]
  >([
    {
      id: '1',
      doc_type: 'spec_sheet',
      title: 'TDS Spek',
      generated_route: '/api/pdf/spec-sheet/bawang-goreng',
      is_verified: false,
    },
    {
      id: '2',
      doc_type: 'halal_declaration',
      title: 'Jaminan Halal',
      generated_route: '/api/pdf/halal-declaration/bawang-goreng',
      is_verified: false,
    },
  ])

  useEffect(() => {
    let mounted = true
    async function loadActiveDocs() {
      try {
        const res = await fetch('/api/claim-documents?active_only=true')
        if (res.ok) {
          const data = await res.json()
          if (mounted && data.documents && Array.isArray(data.documents)) {
            setActiveDocs(data.documents)
          }
        }
      } catch {
        // fallback to initial
      }
    }
    loadActiveDocs()
    return () => {
      mounted = false
    }
  }, [])

  const defaultText = useMemo(() => getWhatsAppPitchText(selectedScript, buyer), [selectedScript, buyer])
  const messageText = customText ?? defaultText

  const info = getWhatsAppVerificationInfo({ ...buyer, notes: buyer.notes })
  const { isLandline } = info
  const isNotRegistered = waStatus === 'not_registered' || isLandline
  const isVerifiedActive =
    waStatus === 'verified_active' ||
    waStatus === 'sent' ||
    waStatus === 'replied' ||
    waStatus === 'sample_requested'

  const rawPhone = buyer.phone || ''
  const cleanPhone = cleanWhatsAppNumber(rawPhone)
  const displayPhone = formatDisplayPhoneNumber(rawPhone)
  const isPhoneValid = cleanPhone.length >= 10

  const directWaUrl = buildWhatsAppDirectUrl(rawPhone, messageText)

  async function handleToggleStatus(newStatus: WhatsAppStatus) {
    if (!buyer) return
    setWaStatus(newStatus)

    try {
      const res = await fetch('/api/crm/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: buyer.id,
          channel: 'whatsapp',
          status: newStatus,
          summary: `Verifikasi status WhatsApp diubah menjadi: ${newStatus}`,
        }),
      })

      if (!res.ok) {
        throw new Error('Gagal update verifikasi')
      }

      if (onStatusUpdated) {
        onStatusUpdated(buyer.id, newStatus)
      }

      if (newStatus === 'verified_active') {
        toast.success('Nomor berhasil diverifikasi: WA Aktif ✓')
      } else if (newStatus === 'not_registered') {
        toast.warning('Nomor ditandai: Bukan Nomor WhatsApp ✕')
      } else {
        toast.info('Status WhatsApp direset ke: Belum Dicek')
      }
    } catch {
      toast.error('Gagal memperbarui status verifikasi WhatsApp.')
    }
  }

  function handleCopyPhone() {
    if (!buyer || !rawPhone) {
      toast.error('Nomor telepon belum terdaftar pada profil buyer.')
      return
    }
    navigator.clipboard.writeText(cleanPhone)
    setCopiedPhone(true)
    toast.success(`Nomor WhatsApp (${cleanPhone}) disalin ke clipboard!`)
    setTimeout(() => setCopiedPhone(false), 2000)
  }

  function handleCopyMessage() {
    navigator.clipboard.writeText(messageText)
    setCopiedMessage(true)
    toast.success('Pesan penawaran WhatsApp berhasil disalin ke clipboard!')
    setTimeout(() => setCopiedMessage(false), 2000)
  }

  async function handleOpenWhatsApp() {
    if (!buyer) return
    if (!isPhoneValid) {
      toast.error('Nomor telepon belum valid untuk WhatsApp. Harap lengkapi nomor telepon.')
      return
    }

    // Record interaction as sent
    try {
      await fetch('/api/crm/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: buyer.id,
          channel: 'whatsapp',
          status: 'sent',
          summary: `Mengirim penawaran via WhatsApp: ${selectedScript}`,
        }),
      })
      setWaStatus('sent')
      if (onStatusUpdated) {
        onStatusUpdated(buyer.id, 'sent')
      }
    } catch {
      // Non-blocking
    }

    // Open WhatsApp
    window.open(directWaUrl, '_blank')
    toast.success('Membuka WhatsApp...')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div
          className={`p-6 border-b border-gray-100 flex items-start justify-between text-white transition-colors ${
            isNotRegistered
              ? 'bg-gradient-to-r from-slate-900 to-rose-950'
              : 'bg-gradient-to-r from-emerald-900 to-[#1a472a]'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${isNotRegistered ? 'bg-rose-500/20 text-rose-300' : 'bg-white/10 text-emerald-300'}`}>
                {isNotRegistered ? <PhoneOff className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
              </span>
              <span className="text-xs font-bold tracking-wide uppercase text-white/90">
                {isNotRegistered ? 'Sales Outreach Desk (Panggilan Telepon)' : 'WhatsApp B2B Sales Outreach Desk'}
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {buyer.company_name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <span>PIC: <strong>{buyer.contact_name || 'Tim Pengadaan'}</strong></span>
              <span>•</span>
              <span>Wilayah: <strong>{buyer.country || 'Indonesia'}</strong></span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Phone Bar & Verification Toggle */}
        <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${isNotRegistered ? 'bg-rose-50/70 border-rose-100' : 'bg-emerald-50/70 border-emerald-100'}`}>
          <div className="flex items-center gap-2.5">
            {isNotRegistered ? (
              <PhoneOff className="w-4 h-4 text-rose-700 shrink-0" />
            ) : isVerifiedActive ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <div>
              <span className="text-xs text-gray-500 font-medium">Kontak PIC: </span>
              <strong className="text-sm font-bold text-gray-900 ml-1">
                {displayPhone}
              </strong>
              {cleanPhone && !isNotRegistered && (
                <span className="ml-2 text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                  wa.me/{cleanPhone}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick 1-click status verification toggles */}
            <div className="flex items-center bg-white rounded-xl border border-gray-200 p-0.5 shadow-2xs text-xs">
              <button
                type="button"
                onClick={() => handleToggleStatus('verified_active')}
                title="Tandai nomor ini memiliki akun WhatsApp aktif"
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isVerifiedActive
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Check className="w-3 h-3" />
                <span>WA Aktif</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus('not_registered')}
                title="Tandai nomor ini TIDAK terdaftar di WhatsApp (hubungi via telepon suara)"
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isNotRegistered
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'text-gray-600 hover:text-rose-700 hover:bg-rose-50'
                }`}
              >
                <PhoneOff className="w-3 h-3" />
                <span>Bukan WA</span>
              </button>
              {waStatus !== 'uncontacted' && (
                <button
                  type="button"
                  onClick={() => handleToggleStatus('uncontacted')}
                  title="Reset status verifikasi ke belum dicek"
                  className="px-1.5 py-1 text-[10px] text-gray-400 hover:text-gray-600 rounded-md"
                >
                  Reset
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleCopyPhone}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-600" />}
              <span>{copiedPhone ? 'Tersalin!' : 'Salin Nomor'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Warning Banner for Not Registered or Landline */}
          {isNotRegistered && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-900 animate-in fade-in">
              <PhoneOff className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold flex items-center gap-1.5">
                  <span>Nomor Tidak Terdaftar di WhatsApp</span>
                  <span className="text-[10px] bg-rose-200/80 text-rose-800 px-1.5 py-0.2 rounded font-semibold">
                    {isLandline ? 'PSTN Kantor' : 'GSM Bukan Akun WA'}
                  </span>
                </p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Nomor ini ditandai tidak memiliki WhatsApp. Disarankan menghubungi langsung via telepon suara ke{' '}
                  <a href={`tel:${rawPhone}`} className="font-bold underline hover:text-rose-900">
                    {displayPhone}
                  </a>{' '}
                  atau mengirimkan dokumen via email PIC.
                </p>
              </div>
            </div>
          )}

          {/* Strategy Script Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                Pilih Strategi Pesan Penawaran:
              </span>
              <span className="text-[11px] font-normal text-gray-500">
                Otomatis menyertakan nama PIC & link dokumen resmi
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WHATSAPP_SCRIPT_OPTIONS.map((opt) => {
                const isSelected = selectedScript === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedScript(opt.id)
                      setCustomText(null)
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-gray-900">
                        {opt.title}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                          isSelected
                            ? 'bg-emerald-700 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-tight">
                      {opt.subtitle}
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-800/80 font-medium">
                      🎯 Rekomendasi: {opt.recommendedFor}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Live Editable Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700">
                Pratinjau Pesan Penawaran (Siap Dikirim / Bisa Diedit):
              </label>
              <span className="text-[10px] text-gray-400">
                {messageText.length} karakter
              </span>
            </div>

            <textarea
              rows={9}
              value={messageText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none text-xs font-mono leading-relaxed text-gray-800 shadow-inner"
            />
          </div>

          {/* Attached Document Quick Verification */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-gray-600 font-medium">
              {activeDocs.length > 0
                ? 'Dokumen resmi terlampir di dalam pesan:'
                : 'Tidak ada dokumen klaim yang aktif dibagikan.'}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {activeDocs.map((d) => {
                const url = d.generated_route || d.supporting_file_url
                if (!url) return null
                const isHalal = d.doc_type === 'halal_declaration'
                const isCoa = d.doc_type === 'coa'
                return (
                  <a
                    key={d.id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                      isHalal
                        ? 'text-amber-900 bg-white border-amber-200 hover:bg-amber-50'
                        : isCoa
                        ? 'text-purple-900 bg-white border-purple-200 hover:bg-purple-50'
                        : 'text-emerald-800 bg-white border-emerald-200 hover:bg-emerald-50'
                    }`}
                    title={`${d.title}${d.is_verified ? ' (Terverifikasi Supplier)' : ' (Draft Belum Diverifikasi)'}`}
                  >
                    {isHalal ? (
                      <ShieldCheck className="w-3 h-3 text-amber-700" />
                    ) : (
                      <FileText className="w-3 h-3 text-emerald-700" />
                    )}
                    {d.doc_type === 'spec_sheet'
                      ? 'TDS Spek ↗'
                      : isHalal
                      ? 'Jaminan Halal ↗'
                      : isCoa
                      ? 'COA Lab ↗'
                      : `${d.title} ↗`}
                  </a>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 text-center sm:text-left">
            💡 Teks otomatis berformat WhatsApp (*bold* & poin). Tekan Salin atau Hubungi.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              {copiedMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
              <span>{copiedMessage ? 'Pesan Tersalin!' : 'Salin Pesan'}</span>
            </button>

            {isNotRegistered ? (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${rawPhone}`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Panggil Telepon</span>
                </a>
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  disabled={!isPhoneValid}
                  title="Coba buka paksa di WhatsApp Web"
                  className="p-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-500 hover:text-emerald-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                disabled={!isPhoneValid}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Buka WhatsApp (wa.me)</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
