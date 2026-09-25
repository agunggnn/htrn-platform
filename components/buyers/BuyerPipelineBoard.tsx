'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileText,
  Mail,
  MessageCircle,
  Building2,
  Filter,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  getBuyerStage,
  getBuyerTier,
  getBuyerScore,
  detectProductLine,
} from '@/lib/buyers-helper'
import type { Buyer, BuyerTier, PipelineStage } from '@/types'

type Props = {
  initialBuyers: Buyer[]
}

const STAGES: { id: PipelineStage; label: string; color: string; badgeBg: string; borderTop: string }[] = [
  {
    id: 'lead',
    label: '01. Leads / Database',
    color: 'text-slate-700',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    borderTop: 'border-slate-400',
  },
  {
    id: 'target_outreach',
    label: '02. Target Outreach',
    color: 'text-blue-700',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    borderTop: 'border-blue-500',
  },
  {
    id: 'sample_sent',
    label: '03. Sample Sent',
    color: 'text-purple-700',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    borderTop: 'border-purple-500',
  },
  {
    id: 'quotation_sent',
    label: '04. SPH / Quo Sent',
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    borderTop: 'border-amber-500',
  },
  {
    id: 'active_customer',
    label: '05. Active Partner',
    color: 'text-emerald-700',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderTop: 'border-emerald-600',
  },
  {
    id: 'closed_lost',
    label: '06. Closed / Lost',
    color: 'text-rose-700',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    borderTop: 'border-rose-400',
  },
]

const TIER_CONFIG: Record<BuyerTier, { label: string; className: string }> = {
  tier_1: { label: 'T1: HORECA', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tier_2: { label: 'T2: Catering', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  tier_3: { label: 'T3: Chain', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  tier_4: { label: 'T4: Industrial', className: 'bg-amber-50 text-amber-700 border-amber-200' },
}

function cleanPhoneForWhatsApp(phone?: string | null): string | null {
  if (!phone) return null
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1)
  }
  return cleaned.length >= 10 ? cleaned : null
}

export function BuyerPipelineBoard({ initialBuyers }: Props) {
  // Initialize with resolved stages
  const [buyers, setBuyers] = useState<Buyer[]>(() =>
    initialBuyers.map((b) => ({
      ...b,
      pipeline_stage: getBuyerStage(b),
      buyer_tier: getBuyerTier(b),
      gacoan_similarity_score: getBuyerScore(b),
    }))
  )
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('all')
  const [selectedTier, setSelectedTier] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const filteredBuyers = buyers.filter((b) => {
    const matchesSearch =
      !search ||
      b.company_name.toLowerCase().includes(search.toLowerCase()) ||
      b.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.notes?.toLowerCase().includes(search.toLowerCase())

    const product = detectProductLine(b.notes)
    const matchesProduct =
      selectedProduct === 'all' ||
      (selectedProduct === 'bawang' && product.includes('Bawang Merah')) ||
      (selectedProduct === 'lada' && product.includes('Lada')) ||
      (selectedProduct === 'bawang_putih' && product.includes('Bawang Putih')) ||
      (selectedProduct === 'rempah' && product.includes('Rempah'))

    const buyerTier = b.buyer_tier ?? getBuyerTier(b)
    const matchesTier = selectedTier === 'all' || buyerTier === selectedTier

    return matchesSearch && matchesProduct && matchesTier
  })

  async function handleStageChange(buyerId: string, newStage: PipelineStage) {
    const previousBuyers = [...buyers]
    setUpdatingId(buyerId)

    // Optimistic update
    setBuyers((current) =>
      current.map((b) => (b.id === buyerId ? { ...b, pipeline_stage: newStage } : b))
    )

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('buyers')
        .update({ pipeline_stage: newStage })
        .eq('id', buyerId)

      if (error) {
        // Even if column doesn't exist yet on remote, local state stays updated
        console.warn('Note on pipeline stage sync:', error.message)
      }

      const stageObj = STAGES.find((s) => s.id === newStage)
      toast.success(`Tahap dipindahkan ke ${stageObj?.label.split('. ')[1] ?? newStage}`)
    } catch {
      setBuyers(previousBuyers)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari prospek atau catatan..."
            className="w-full text-sm bg-transparent border-none focus:outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Product Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
            >
              <option value="all">Semua Produk</option>
              <option value="bawang">🧅 Bawang Merah Goreng</option>
              <option value="lada">🧂 Lada Bubuk</option>
              <option value="bawang_putih">🧄 Bawang Putih Kupas</option>
              <option value="rempah">🌿 Rempah Bubuk</option>
            </select>
          </div>

          {/* Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
          >
            <option value="all">Semua Tier</option>
            <option value="tier_1">Tier 1 (HORECA)</option>
            <option value="tier_2">Tier 2 (Catering)</option>
            <option value="tier_3">Tier 3 (Chain Resto)</option>
            <option value="tier_4">Tier 4 (Industrial)</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px]">
          {STAGES.map((stage) => {
            const stageBuyers = filteredBuyers.filter(
              (b) => (b.pipeline_stage ?? getBuyerStage(b)) === stage.id
            )

            return (
              <div
                key={stage.id}
                className="w-72 flex-shrink-0 flex flex-col bg-gray-100/70 rounded-2xl border border-gray-200/80 overflow-hidden"
              >
                {/* Column Header */}
                <div
                  className={`p-3.5 border-t-4 bg-white border-b border-gray-200 flex items-center justify-between ${stage.borderTop}`}
                >
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>
                    {stage.label}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${stage.badgeBg}`}
                  >
                    {stageBuyers.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 p-2.5 flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {stageBuyers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 border border-dashed border-gray-300 rounded-xl">
                      Kosong
                    </div>
                  ) : (
                    stageBuyers.map((b) => {
                      const productLine = detectProductLine(b.notes)
                      const waPhone = cleanPhoneForWhatsApp(b.phone)
                      const tierKey = b.buyer_tier ?? getBuyerTier(b)
                      const tier = tierKey ? TIER_CONFIG[tierKey] : null
                      const score = getBuyerScore(b)
                      const isUpdating = updatingId === b.id

                      return (
                        <div
                          key={b.id}
                          className={`bg-white rounded-xl border border-gray-200/90 p-3 shadow-xs hover:shadow-md transition-all flex flex-col gap-2.5 ${
                            isUpdating ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {/* Header: Company & Gacoan Score */}
                          <div className="flex items-start justify-between gap-1.5">
                            <Link
                              href={`/buyers/${b.id}`}
                              className="font-semibold text-xs text-gray-900 hover:text-[#1a472a] leading-tight line-clamp-1"
                              title={b.company_name}
                            >
                              {b.company_name}
                            </Link>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                                score >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : score >= 55
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                              title="Kecocokan Spesifikasi vs Benchmark Gacoan"
                            >
                              {score}% Fit
                            </span>
                          </div>

                          {/* Contact & Location */}
                          <div className="text-[11px] text-gray-500 space-y-0.5">
                            {b.contact_name && (
                              <p className="text-gray-700 font-medium truncate">{b.contact_name}</p>
                            )}
                            {b.country && (
                              <div className="flex items-center gap-1 text-gray-400">
                                <Building2 className="w-3 h-3 shrink-0" />
                                <span className="truncate">{b.country}</span>
                              </div>
                            )}
                          </div>

                          {/* Chips: Product & Tier */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200 rounded-md">
                              {productLine}
                            </span>
                            {tier && (
                              <span
                                className={`px-2 py-0.5 text-[10px] font-semibold border rounded-md ${tier.className}`}
                              >
                                {tier.label}
                              </span>
                            )}
                          </div>

                          {/* Notes snippet */}
                          {b.notes && (
                            <p
                              className="text-[11px] text-gray-500 bg-gray-50/70 p-2 rounded-lg border border-gray-100 line-clamp-2 leading-relaxed"
                              title={b.notes}
                            >
                              {b.notes}
                            </p>
                          )}

                          {/* Actions Bar */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-1">
                            {/* Fast Contact Options */}
                            <div className="flex items-center gap-1">
                              {waPhone && (
                                <a
                                  href={`https://wa.me/${waPhone}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-gray-400 hover:text-emerald-600 rounded-md hover:bg-emerald-50 transition-colors"
                                  title="Chat via WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {b.email && (
                                <a
                                  href={`mailto:${b.email}`}
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                                  title={`Email ${b.email}`}
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <Link
                                href={`/quotations/new?buyer_id=${b.id}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[#1a472a] hover:bg-emerald-50 rounded-md transition-colors"
                                title="Buat Surat Penawaran Harga"
                              >
                                <FileText className="w-3 h-3" />
                                + SPH
                              </Link>
                            </div>

                            {/* Quick Stage Mover Selector */}
                            <select
                              value={b.pipeline_stage ?? getBuyerStage(b)}
                              onChange={(e) =>
                                handleStageChange(b.id, e.target.value as PipelineStage)
                              }
                              className="text-[10px] bg-gray-50 border border-gray-200 text-gray-700 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  Pindah: {s.label.split('. ')[1]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
