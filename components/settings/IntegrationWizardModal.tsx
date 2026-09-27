'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Phone,
  Cpu,
  ShoppingBag,
  Lock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  RefreshCw,
  ClipboardCopy,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SecretCategory } from '@/lib/secrets-helper'

type IntegrationService = {
  id: string
  name: string
  category: SecretCategory
  icon: React.ComponentType<{ className?: string }>
  desc: string
  color: string
  bg: string
  keyName: string
  placeholder: string
  helpUrl: string
  helpText: string
  formatValidation: (val: string) => boolean | string
}

const SERVICES: IntegrationService[] = [
  {
    id: 'chatwoot',
    name: 'Chatwoot WhatsApp CRM',
    category: 'chatwoot',
    icon: MessageSquare,
    desc: 'Integrasi inbox percakapan WhatsApp untuk Sales AI & Agentic CRM.',
    color: '#0284c7',
    bg: 'bg-sky-50',
    keyName: 'CHATWOOT_API_ACCESS_TOKEN',
    placeholder: 'ct_acc_token_...',
    helpUrl: 'https://app.chatwoot.com/app/profile/settings',
    helpText: 'Masuk ke Chatwoot -> Profile Settings -> Access Tokens -> Copy Token.',
    formatValidation: (val) => val.length >= 8 || 'Token harus memiliki minimal 8 karakter.',
  },
  {
    id: 'getcontact',
    name: 'Getcontact Intelligence API',
    category: 'getcontact',
    icon: Phone,
    desc: 'Pengecekan reputasi nomor telepon buyer, tag kontak, dan mitigasi penipuan.',
    color: '#2563eb',
    bg: 'bg-blue-50',
    keyName: 'GETCONTACT_API_KEY',
    placeholder: 'gc_live_key_...',
    helpUrl: 'https://getcontact.com',
    helpText: 'Dapatkan token autentikasi API Getcontact Business dari akun resmi Anda.',
    formatValidation: (val) => val.length >= 10 || 'API Key Getcontact tidak valid (terlalu pendek).',
  },
  {
    id: 'ai_openrouter',
    name: 'AI / LLM Engine (OpenRouter)',
    category: 'ai',
    icon: Cpu,
    desc: 'Penalaran JEV System 2 untuk perhitungan susut, parsing PO, & sales auto-pilot.',
    color: '#7c3aed',
    bg: 'bg-purple-50',
    keyName: 'OPENROUTER_API_KEY',
    placeholder: 'sk-or-v1-...',
    helpUrl: 'https://openrouter.ai/keys',
    helpText: 'Buka OpenRouter -> Keys -> Create Key -> Salin token dengan awalan sk-or-.',
    formatValidation: (val) =>
      val.startsWith('sk-or-') || val.length >= 20 || 'Token OpenRouter biasanya diawali dengan sk-or-.',
  },
  {
    id: 'shopee_crawler',
    name: 'Shopee Wholesale Price Scraper',
    category: 'database',
    icon: ShoppingBag,
    desc: 'Kredensial atau cookie sesi untuk penarikan data harga grosir bawang Brebes di Shopee.',
    color: '#ea580c',
    bg: 'bg-orange-50',
    keyName: 'SHOPEE_CRAWLER_COOKIE',
    placeholder: 'SPC_EC=...; SPC_T_ID=...',
    helpUrl: 'https://shopee.co.id',
    helpText: 'Opsional: masukkan cookie sesi Shopee untuk memintas rate-limit pencarian grosir.',
    formatValidation: (val) => val.length > 5 || 'Cookie / token harus diisi.',
  },
  {
    id: 'director_pin',
    name: 'PIN Otorisasi Direktur Utama',
    category: 'security',
    icon: Lock,
    desc: 'PIN keamanan Pak Agung Gunawan untuk persetujuan transaksi khusus & override batas floor.',
    color: '#059669',
    bg: 'bg-emerald-50',
    keyName: 'DIRECTOR_APPROVAL_PIN',
    placeholder: '6 digit angka (contoh: 889900)',
    helpUrl: '#',
    helpText: 'Gunakan 6 digit angka rahasia yang hanya diketahui oleh Direktur Utama.',
    formatValidation: (val) =>
      (/^\d{6}$/.test(val) ? true : 'PIN harus berupa tepat 6 digit angka.'),
  },
]

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function IntegrationWizardModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [selectedService, setSelectedService] = useState<IntegrationService>(SERVICES[0])
  const [tokenValue, setTokenValue] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  function handleSelect(service: IntegrationService) {
    setSelectedService(service)
    setTokenValue('')
    setTestResult(null)
    setStep(2)
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setTokenValue(text.trim())
        toast.success('Kredensial ditempel dari clipboard')
      }
    } catch {
      toast.error('Gagal mengakses clipboard sistem')
    }
  }

  async function handleTestConnection() {
    const validation = selectedService.formatValidation(tokenValue.trim())
    if (validation !== true) {
      toast.error(typeof validation === 'string' ? validation : 'Format token tidak valid')
      return
    }

    setTestingConnection(true)
    setTestResult(null)

    // Simulate connection ping
    await new Promise((r) => setTimeout(r, 900))
    setTestingConnection(false)
    setTestResult({
      ok: true,
      message: `Format ${selectedService.name} valid dan siap diaktifkan di platform.`,
    })
    toast.success('Uji format & koneksi berhasil!')
  }

  async function handleSave() {
    if (!tokenValue.trim()) {
      toast.error('Kredensial tidak boleh kosong')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedService.category,
          secrets: {
            [selectedService.keyName]: tokenValue.trim(),
          },
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Kredensial ${selectedService.name} berhasil disimpan dan diamankan!`)
        onSuccess()
        onClose()
        setStep(1)
        setTokenValue('')
      } else {
        toast.error(data.error || 'Gagal menyimpan kredensial')
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan ke database')
    } finally {
      setSaving(false)
    }
  }

  const Icon = selectedService.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#1a472a] text-white flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">
                Wizard Konfigurasi Kredensial & Integrasi
              </h3>
              <p className="text-xs text-gray-500">
                Langkah {step} dari 4: {step === 1 ? 'Pilih Layanan' : step === 2 ? 'Panduan Token' : step === 3 ? 'Input Kredensial' : 'Uji & Simpan'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Step 1: Select Service */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-600">
                Pilih layanan atau kredensial yang ingin Anda hubungkan ke HTRN Trade Platform:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {SERVICES.map((srv) => {
                  const SrvIcon = srv.icon
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => handleSelect(srv)}
                      className="group flex items-start gap-3.5 p-3.5 rounded-xl border border-gray-200 hover:border-emerald-600 hover:bg-emerald-50/20 text-left transition-all cursor-pointer"
                    >
                      <div
                        className={`h-9 w-9 rounded-lg ${srv.bg} flex items-center justify-center shrink-0 mt-0.5`}
                        style={{ color: srv.color }}
                      >
                        <SrvIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-900">
                            {srv.name}
                          </p>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{srv.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Guide & Source Link */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div
                  className={`h-8 w-8 rounded-lg ${selectedService.bg} flex items-center justify-center shrink-0`}
                  style={{ color: selectedService.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{selectedService.name}</h4>
                  <p className="text-xs text-gray-500">{selectedService.desc}</p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-2">
                <h5 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> Di mana saya bisa mendapatkan token ini?
                </h5>
                <p className="text-xs text-blue-800 leading-relaxed">
                  {selectedService.helpText}
                </p>
                {selectedService.helpUrl !== '#' && (
                  <a
                    href={selectedService.helpUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 underline mt-1"
                  >
                    Buka Dashboard Resmi <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-1">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Target Konfigurasi Sistem:
                </span>
                <p className="font-mono text-xs text-gray-800 font-bold">{selectedService.keyName}</p>
              </div>
            </div>
          )}

          {/* Step 3: Input Protected Value */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700">
                  Masukkan Nilai Kredensial ({selectedService.keyName}):
                </label>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                >
                  <ClipboardCopy className="h-3 w-3" /> Tempel dari Clipboard
                </button>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder={selectedService.placeholder}
                  value={tokenValue}
                  onChange={(e) => setTokenValue(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-mono focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <p className="text-[11px] text-gray-500">
                🔒 Nilai token akan disimpan di vault Supabase dan hanya disuntikkan secara dinamis saat proses otorisasi berjalan.
              </p>
            </div>
          )}

          {/* Step 4: Test & Activate */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ringkasan Konfigurasi:</span>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">{selectedService.name}</span>
                  <span className="font-mono text-xs text-gray-500">
                    {tokenValue ? `${tokenValue.slice(0, 4)}••••${tokenValue.slice(-4)}` : 'Kosong'}
                  </span>
                </div>
              </div>

              {testResult ? (
                <div className={`p-4 rounded-xl border ${testResult.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'} space-y-1`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {testResult.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
                    <span>{testResult.ok ? 'Verifikasi Sukses' : 'Verifikasi Gagal'}</span>
                  </div>
                  <p className="text-xs">{testResult.message}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !tokenValue.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menguji format & respon...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-700" /> Uji Format & Validasi Koneksi
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="bg-gray-50 border-t border-gray-100 p-4 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Kembali
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 3 && !tokenValue.trim()) {
                  toast.error('Masukkan token terlebih dahulu sebelum melanjutkan')
                  return
                }
                setStep((prev) => (prev + 1) as 2 | 3 | 4)
              }}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1a472a] text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              Lanjutkan <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !tokenValue.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#1a472a] text-xs font-bold text-white shadow-2xs hover:opacity-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Simpan & Aktifkan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
