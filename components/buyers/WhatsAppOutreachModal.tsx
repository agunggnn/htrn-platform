'use client'

import { useState, useEffect } from 'react'
import {
  X,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Phone,
  FileText,
  ShieldCheck,
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
import type { Buyer } from '@/types'

type Props = {
  isOpen: boolean
  onClose: () => void
  buyer: Buyer | null
  onStatusUpdated?: (buyerId: string, status: string) => void
}

export function WhatsAppOutreachModal({ isOpen, onClose, buyer, onStatusUpdated }: Props) {
  const [selectedScript, setSelectedScript] = useState<WhatsAppScriptType>('sample_offer')
  const [messageText, setMessageText] = useState('')
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState(false)

  // Re-generate text whenever selected script or buyer changes
  useEffect(() => {
    if (buyer) {
      const generated = getWhatsAppPitchText(selectedScript, buyer)
      setMessageText(generated)
    }
  }, [selectedScript, buyer])

  if (!isOpen || !buyer) return null

  const rawPhone = buyer.phone || ''
  const cleanPhone = cleanWhatsAppNumber(rawPhone)
  const displayPhone = formatDisplayPhoneNumber(rawPhone)
  const isPhoneValid = cleanPhone.length >= 10

  const directWaUrl = buildWhatsAppDirectUrl(rawPhone, messageText)

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

    // Record interaction as contacted
    try {
      await fetch('/api/crm/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: buyer.id,
          channel: 'whatsapp',
          status: 'contacted',
          summary: `Mengirim penawaran via WhatsApp: ${selectedScript}`,
        }),
      })
      if (onStatusUpdated) {
        onStatusUpdated(buyer.id, 'contacted')
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
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-emerald-900 to-[#1a472a] text-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-white/10 text-emerald-300">
                <MessageCircle className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold tracking-wide uppercase text-emerald-200">
                WhatsApp B2B Sales Outreach Desk
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {buyer.company_name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-emerald-100">
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

        {/* Quick Phone Bar (Always Ready to Copy) */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="text-xs text-gray-500 font-medium">Kontak WhatsApp: </span>
              <strong className="text-sm font-bold text-gray-900 ml-1">
                {displayPhone}
              </strong>
              {cleanPhone && (
                <span className="ml-2 text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-800">
                  wa.me/{cleanPhone}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyPhone}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-100/80 border border-emerald-300 text-xs font-semibold shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
            <span>{copiedPhone ? 'Tersalin!' : 'Salin Nomor HP'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
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
                    onClick={() => setSelectedScript(opt.id)}
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
                Pratinjau Pesan WhatsApp (Siap Dikirim / Bisa Diedit):
              </label>
              <span className="text-[10px] text-gray-400">
                {messageText.length} karakter
              </span>
            </div>

            <textarea
              rows={9}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50/70 focus:bg-white focus:ring-2 focus:ring-emerald-700 focus:outline-none text-xs font-mono leading-relaxed text-gray-800 shadow-inner"
            />
          </div>

          {/* Attached Document Quick Verification */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-gray-600 font-medium">Dokumen resmi terlampir di dalam pesan:</span>
            <div className="flex items-center gap-2">
              <a
                href="/api/pdf/spec-sheet/bawang-goreng"
                target="_blank"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-gray-200 hover:bg-emerald-50"
              >
                <FileText className="w-3 h-3 text-emerald-700" />
                TDS Spek ↗
              </a>
              <a
                href="/api/pdf/halal-declaration/bawang-goreng"
                target="_blank"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-white px-2 py-0.5 rounded-md border border-gray-200 hover:bg-amber-50"
              >
                <ShieldCheck className="w-3 h-3 text-amber-700" />
                Jaminan Halal ↗
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 text-center sm:text-left">
            💡 Teks otomatis berformat WhatsApp (*bold* & poin). Tekan Salin atau Buka WA.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            >
              {copiedMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-600" />}
              <span>{copiedMessage ? 'Pesan Tersalin!' : 'Salin Pesan WA'}</span>
            </button>

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
          </div>
        </div>
      </div>
    </div>
  )
}
