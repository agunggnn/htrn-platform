'use client'

import { useState, useTransition } from 'react'
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Lock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Phone,
  Cpu,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SecretMetadataItem, SecretCategory } from '@/lib/secrets-helper'

type Props = {
  initialSecrets: SecretMetadataItem[]
}

const CATEGORY_META: Record<
  SecretCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  getcontact: {
    label: 'Getcontact Intelligence',
    icon: Phone,
    description: 'Konfigurasi kredensial API Getcontact untuk profiling reputasi nomor PIC pembeli dan mitigasi risiko.',
  },
  chatwoot: {
    label: 'Chatwoot & WhatsApp Cloud API',
    icon: MessageSquare,
    description: 'Integrasi customer service inbox Chatwoot untuk Autonomous Sales CRM dan bot WhatsApp.',
  },
  ai: {
    label: 'AI & JEV System 2 Engine',
    icon: Cpu,
    description: 'Kredensial LLM (OpenRouter, DeepSeek, Gemini) untuk penalaran negosiasi dan ekstraksi PO otomatis.',
  },
  security: {
    label: 'Otorisasi & Keamanan Direktur',
    icon: Lock,
    description: 'PIN persetujuan Direktur untuk otorisasi transaksi khusus atau override batas margin bawah (floor price).',
  },
  database: {
    label: 'Database & Infrastruktur',
    icon: KeyRound,
    description: 'Kredensial koneksi database Supabase dan service role.',
  },
}

export function IntegrationsForm({ initialSecrets }: Props) {
  const [secrets, setSecrets] = useState<SecretMetadataItem[]>(initialSecrets)
  const [values, setValues] = useState<Record<string, string>>({})
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [activeTab, setActiveTab] = useState<SecretCategory>('getcontact')
  const [isPending, startTransition] = useTransition()
  const [refreshing, setRefreshing] = useState(false)

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  function toggleShow(key: string) {
    setShowValues((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/settings/integrations')
      const json = await res.json()
      if (res.ok && json.success) {
        setSecrets(json.secrets)
        toast.success('Status kredensial diperbarui')
      } else {
        toast.error(json.error || 'Gagal memuat status kredensial')
      }
    } catch {
      toast.error('Gagal menghubungi server')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSaveCategory(category: SecretCategory) {
    const categorySecrets = secrets.filter((s) => s.category === category)
    const payload: Record<string, string> = {}
    let hasChanges = false

    for (const sec of categorySecrets) {
      if (values[sec.key] !== undefined && values[sec.key].trim() !== '') {
        payload[sec.key] = values[sec.key].trim()
        hasChanges = true
      }
    }

    if (!hasChanges) {
      toast.info('Tidak ada perubahan nilai token yang dimasukkan.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/settings/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secrets: payload }),
        })

        const json = await res.json()
        if (res.ok && json.success) {
          setSecrets(json.secrets)
          // Clear edited inputs for this category
          setValues((prev) => {
            const next = { ...prev }
            for (const key of Object.keys(payload)) {
              delete next[key]
            }
            return next
          })
          toast.success(json.message || 'Kredensial berhasil disimpan di Hetzer Vault!')
        } else {
          toast.error(json.error || 'Gagal menyimpan kredensial')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error saat menyimpan'
        toast.error(msg)
      }
    })
  }

  const activeCategoryMeta = CATEGORY_META[activeTab]
  const filteredSecrets = secrets.filter((s) => s.category === activeTab)

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Hetzer Vault Security Posture */}
      <div className="p-5 rounded-2xl bg-[#1a472a]/5 border border-[#1a472a]/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-[#1a472a] text-white rounded-xl shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 text-base">
                Integration Credential & Secrets Vault
              </h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                AES-256-GCM Application Vault
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
              Seluruh token dan API key tersimpan terenkripsi (AES-256-GCM) di vault database level aplikasi. Nilai sensitif disamarkan (masked) pada respons UI/API dan diselaraskan dengan konvensi referensi <code>secretRef:&lt;id&gt;</code> untuk integrasi agen.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors self-start md:self-center cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Memeriksa...' : 'Refresh Status'}
        </button>
      </div>

      {/* 2. Category Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {(Object.keys(CATEGORY_META) as SecretCategory[])
          .filter((cat) => cat !== 'database') // Database is managed via platform env
          .map((cat) => {
            const meta = CATEGORY_META[cat]
            const Icon = meta.icon
            const catSecrets = secrets.filter((s) => s.category === cat)
            const configuredCount = catSecrets.filter((s) => s.isConfigured).length
            const isActive = activeTab === cat

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTab(cat)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1a472a] text-white shadow-xs'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{meta.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : configuredCount === catSecrets.length && catSecrets.length > 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {configuredCount}/{catSecrets.length}
                </span>
              </button>
            )
          })}
      </div>

      {/* 3. Category Content & Form Inputs */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <activeCategoryMeta.icon className="w-5 h-5 text-[#1a472a]" />
              <h3 className="font-bold text-gray-900 text-base">{activeCategoryMeta.label}</h3>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{activeCategoryMeta.description}</p>
          </div>

          {activeTab === 'getcontact' && (
            <a
              href="https://web.getcontact.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#1a472a] hover:underline font-semibold"
            >
              Buka Getcontact Web <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Inputs List */}
        <div className="space-y-5">
          {filteredSecrets.map((sec) => {
            const isEditing = values[sec.key] !== undefined
            const isRevealed = showValues[sec.key] || false

            return (
              <div
                key={sec.key}
                className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-900">{sec.label}</label>
                    <span className="text-[10px] text-gray-400 font-mono">({sec.key})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200/80 text-gray-700">
                      {sec.secretRef}
                    </span>

                    {sec.isConfigured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> Terkonfigurasi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <AlertCircle className="w-3 h-3" /> Belum Dikonfigurasi
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 leading-normal">{sec.description}</p>

                {/* Masked status if already set */}
                {sec.isConfigured && !isEditing && (
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200 text-xs">
                    <div className="flex items-center gap-2 font-mono text-gray-600 truncate">
                      <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{sec.maskedValue}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange(sec.key, '')}
                      className="text-xs text-[#1a472a] hover:underline font-semibold shrink-0 cursor-pointer ml-2"
                    >
                      Ubah Kredensial
                    </button>
                  </div>
                )}

                {/* Active input field */}
                {(!sec.isConfigured || isEditing) && (
                  <div className="relative">
                    <input
                      type={sec.isSecret && !isRevealed ? 'password' : 'text'}
                      value={values[sec.key] || ''}
                      onChange={(e) => handleChange(sec.key, e.target.value)}
                      placeholder={sec.placeholder || `Masukkan nilai ${sec.label}...`}
                      className="w-full text-xs font-mono border border-gray-300 rounded-xl px-3.5 py-2.5 pr-10 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a472a] focus:border-transparent transition-all shadow-2xs"
                    />

                    {sec.isSecret && (
                      <button
                        type="button"
                        onClick={() => toggleShow(sec.key)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                        title={isRevealed ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">
            Perubahan disimpan langsung ke Hetzer Vault dengan proteksi terenkripsi.
          </p>

          <button
            type="button"
            onClick={() => handleSaveCategory(activeTab)}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-opacity hover:opacity-95 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: '#1a472a' }}
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Menyimpan ke Vault...' : `Simpan ${activeCategoryMeta.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
