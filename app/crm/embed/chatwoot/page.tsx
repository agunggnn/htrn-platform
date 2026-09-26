'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ShieldCheck,
  Lock,
  Sparkles,
  Bot,
  UserCheck,
  FileText,
  Phone,
  Building2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Buyer, AgentMode } from '@/types'

function ChatwootEmbedContent() {
  const searchParams = useSearchParams()
  const phone = searchParams.get('phone') || searchParams.get('phone_number') || ''
  const conversationId = searchParams.get('conversation_id') || ''

  const [loading, setLoading] = useState(true)
  const [buyer, setBuyer] = useState<Buyer | null>(null)
  const [agentMode, setAgentMode] = useState<AgentMode>('auto_pilot')
  const [updatingMode, setUpdatingMode] = useState(false)

  useEffect(() => {
    async function loadBuyer() {
      if (!phone) {
        setLoading(false)
        return
      }
      try {
        const res = await fetch(`/api/crm/lookup?phone=${encodeURIComponent(phone)}`)
        const data = await res.json()
        if (data.found && data.buyer) {
          setBuyer(data.buyer)
        }
      } catch (err) {
        console.error('Failed to lookup buyer in Chatwoot embed:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBuyer()
  }, [phone])

  async function handleToggleAgentMode(newMode: AgentMode) {
    setUpdatingMode(true)
    setAgentMode(newMode)
    try {
      if (conversationId) {
        await fetch('/api/crm/chatwoot/agent-mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation_id: conversationId,
            agent_mode: newMode,
          }),
        })
      }
      toast.success(
        newMode === 'auto_pilot'
          ? 'Mode AI Auto-Pilot Aktif 🤖'
          : newMode === 'human_in_loop'
          ? 'Mode Review Manusia Aktif 👤'
          : 'AI Dihentikan Sementara ⏸️'
      )
    } catch {
      toast.error('Gagal memperbarui mode agen')
    } finally {
      setUpdatingMode(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-xs text-gray-500 flex items-center gap-2">
        <span className="animate-spin">⏳</span>
        <span>Memuat profil HTRN B2B...</span>
      </div>
    )
  }

  const isKyc = buyer?.kyc_verified || (buyer?.notes || '').includes('[KYC: verified')
  const tier = buyer?.buyer_tier || 'tier_2'
  const pic = buyer?.contact_name || 'PIC Belum Terdaftar'
  const company = buyer?.company_name || 'Calon Prospek WhatsApp'

  return (
    <div className="p-3.5 space-y-3.5 font-sans text-xs bg-slate-50 min-h-screen text-slate-800">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-[#1a472a] text-white flex items-center justify-center font-bold text-[10px]">
            H
          </div>
          <span className="font-bold text-slate-900 tracking-tight">HTRN Intelligence</span>
        </div>
        <span className="text-[10px] text-emerald-700 bg-emerald-100/80 font-bold px-1.5 py-0.5 rounded">
          Live B2B
        </span>
      </div>

      {/* Buyer Quick Card */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-sm text-slate-900 leading-tight">{company}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">PIC: <strong>{pic}</strong></p>
          </div>
          {isKyc ? (
            <span
              title="B2B KYC Terverifikasi: Plafon Kredit Aktif"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              KYC OK
            </span>
          ) : (
            <span
              title="Belum KYC: Terkunci Cash Before Delivery"
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0"
            >
              <Lock className="w-3 h-3 text-amber-700" />
              Kunci CBD
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
          <span>Klasifikasi: <strong className="uppercase text-slate-900">{tier}</strong></span>
          <span>Termin: <strong className="text-slate-900">{buyer?.payment_terms || 'CBD'}</strong></span>
        </div>
      </div>

      {/* Autonomous Agent Mode Control */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-emerald-700" />
            Mode Agen AI Otonom:
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            {updatingMode ? 'Menyimpan...' : 'Real-time'}
          </span>
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleToggleAgentMode('auto_pilot')}
            className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
              agentMode === 'auto_pilot'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600/30'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px]">🤖 Auto-Pilot</span>
              {agentMode === 'auto_pilot' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 leading-tight">
              Balas otomatis FAQ & Penawaran
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleAgentMode('human_in_loop')}
            className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
              agentMode === 'human_in_loop'
                ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600/30'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px]">👤 Manual</span>
              {agentMode === 'human_in_loop' && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 leading-tight">
              Draf saja, Pak Agung kirim
            </span>
          </button>
        </div>
      </div>

      {/* Quick Sales Actions */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Tindakan Cepat HTRN:
        </label>

        <div className="grid grid-cols-1 gap-1.5">
          {buyer ? (
            <a
              href={`/quotations/new?buyer_id=${buyer.id}`}
              target="_blank"
              className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-between shadow-2xs transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Buat SPH Resmi (PDF)
              </span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          ) : (
            <span className="text-[11px] text-slate-400 italic p-1">
              Nomor belum terdaftar di database HTRN
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <a
              href="/api/pdf/spec-sheet/bawang-goreng"
              target="_blank"
              className="flex-1 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-semibold flex items-center justify-center gap-1 shadow-2xs"
            >
              📄 TDS Spek ↗
            </a>
            <a
              href="/api/pdf/halal-declaration/bawang-goreng"
              target="_blank"
              className="flex-1 p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-amber-800 text-[10px] font-semibold flex items-center justify-center gap-1 shadow-2xs"
            >
              🛡️ Halal ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChatwootEmbedPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-gray-500">Memuat embed...</div>}>
      <ChatwootEmbedContent />
    </Suspense>
  )
}
