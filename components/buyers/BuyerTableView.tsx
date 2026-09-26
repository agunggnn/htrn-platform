'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Search,
  MessageCircle,
  Mail,
  FileText,
  Phone,
  PhoneOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { WhatsAppOutreachModal } from './WhatsAppOutreachModal'
import {
  getBuyerStage,
  getBuyerTier,
  getBuyerScore,
  getWhatsAppVerificationInfo,
  encodeWhatsAppStatus,
  type WhatsAppStatus,
} from '@/lib/buyers-helper'
import type { Buyer, BuyerTier, PipelineStage } from '@/types'

type Props = {
  initialBuyers: Buyer[]
}

type GroupByOption = 'stage' | 'tier' | 'country' | 'none'

const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; color: string; badgeClass: string; borderLeft: string; bgHeader: string }
> = {
  lead: {
    label: '01. Leads / Database Awal',
    color: 'text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    borderLeft: 'border-l-slate-400',
    bgHeader: 'bg-slate-50/70',
  },
  target_outreach: {
    label: '02. Target Outreach',
    color: 'text-blue-700',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    borderLeft: 'border-l-blue-500',
    bgHeader: 'bg-blue-50/40',
  },
  sample_sent: {
    label: '03. Sample Sent / Requested',
    color: 'text-purple-700',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    borderLeft: 'border-l-purple-500',
    bgHeader: 'bg-purple-50/40',
  },
  quotation_sent: {
    label: '04. SPH / Quo Sent',
    color: 'text-amber-700',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    borderLeft: 'border-l-amber-500',
    bgHeader: 'bg-amber-50/40',
  },
  negotiation: {
    label: '05. In Negotiation',
    color: 'text-orange-700',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    borderLeft: 'border-l-orange-500',
    bgHeader: 'bg-orange-50/40',
  },
  active_customer: {
    label: '06. Active Partner (Won)',
    color: 'text-emerald-700',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderLeft: 'border-l-emerald-600',
    bgHeader: 'bg-emerald-50/40',
  },
  closed_lost: {
    label: '07. Closed Lost',
    color: 'text-rose-700',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    borderLeft: 'border-l-rose-400',
    bgHeader: 'bg-rose-50/40',
  },
}

const TIER_CONFIG: Record<BuyerTier, { label: string; className: string }> = {
  tier_1: { label: 'T1: HORECA (100–499 kg)', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  tier_2: { label: 'T2: Catering (500–999 kg)', className: 'bg-blue-50 text-blue-800 border-blue-200' },
  tier_3: { label: 'T3: Chain Resto (1–2 ton)', className: 'bg-purple-50 text-purple-800 border-purple-200' },
  tier_4: { label: 'T4: Industrial (> 2 ton)', className: 'bg-amber-50 text-amber-800 border-amber-200' },
}

export function BuyerTableView({ initialBuyers }: Props) {
  const [buyers, setBuyers] = useState<Buyer[]>(initialBuyers)
  const [groupBy, setGroupBy] = useState<GroupByOption>('stage')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [activeWhatsAppBuyer, setActiveWhatsAppBuyer] = useState<Buyer | null>(null)

  // Unique countries list
  const countries = useMemo(() => {
    return Array.from(new Set(buyers.map((b) => b.country).filter(Boolean))).sort() as string[]
  }, [buyers])

  // Filtered buyers
  const filteredBuyers = useMemo(() => {
    return buyers.filter((b) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = b.company_name?.toLowerCase().includes(q)
        const matchContact = b.contact_name?.toLowerCase().includes(q)
        const matchEmail = b.email?.toLowerCase().includes(q)
        if (!matchName && !matchContact && !matchEmail) return false
      }
      if (countryFilter && b.country !== countryFilter) return false
      if (tierFilter && (b.buyer_tier || getBuyerTier(b)) !== tierFilter) return false
      return true
    })
  }, [buyers, searchQuery, countryFilter, tierFilter])

  // Grouped structure
  const groupedData = useMemo(() => {
    if (groupBy === 'none') {
      return [
        {
          id: 'all',
          title: 'Semua Prospek Buyer',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          borderLeft: 'border-l-emerald-600',
          bgHeader: 'bg-emerald-50/20',
          count: filteredBuyers.length,
          items: filteredBuyers,
        },
      ]
    }

    if (groupBy === 'stage') {
      const order: PipelineStage[] = [
        'lead',
        'target_outreach',
        'sample_sent',
        'quotation_sent',
        'negotiation',
        'active_customer',
        'closed_lost',
      ]
      return order.map((stageId) => {
        const config = STAGE_CONFIG[stageId]
        const items = filteredBuyers.filter((b) => (b.pipeline_stage || getBuyerStage(b)) === stageId)
        return {
          id: stageId,
          title: config.label,
          badgeClass: config.badgeClass,
          borderLeft: config.borderLeft,
          bgHeader: config.bgHeader,
          count: items.length,
          items,
        }
      })
    }

    if (groupBy === 'tier') {
      const tiers: BuyerTier[] = ['tier_1', 'tier_2', 'tier_3', 'tier_4']
      return tiers.map((tierId) => {
        const config = TIER_CONFIG[tierId]
        const items = filteredBuyers.filter((b) => (b.buyer_tier || getBuyerTier(b)) === tierId)
        return {
          id: tierId,
          title: config.label,
          badgeClass: config.className,
          borderLeft: 'border-l-emerald-600',
          bgHeader: 'bg-emerald-50/30',
          count: items.length,
          items,
        }
      })
    }

    if (groupBy === 'country') {
      const countryMap = new Map<string, Buyer[]>()
      filteredBuyers.forEach((b) => {
        const c = b.country || 'Indonesia'
        const list = countryMap.get(c) ?? []
        list.push(b)
        countryMap.set(c, list)
      })

      return Array.from(countryMap.entries()).map(([c, items]) => ({
        id: c,
        title: `Wilayah: ${c}`,
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
        borderLeft: 'border-l-slate-500',
        bgHeader: 'bg-slate-50/50',
        count: items.length,
        items,
      }))
    }

    return []
  }, [filteredBuyers, groupBy])

  // Toggle Collapse
  function toggleGroupCollapse(groupId: string) {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  // Quick Inline Stage Update (Streak spreadsheet style)
  async function handleInlineStageChange(buyerId: string, newStage: PipelineStage) {
    // Optimistic UI update
    setBuyers((prev) =>
      prev.map((b) => (b.id === buyerId ? { ...b, pipeline_stage: newStage } : b))
    )

    try {
      const res = await fetch('/api/crm/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: buyerId, pipeline_stage: newStage }),
      })

      if (!res.ok) {
        throw new Error('Gagal memperbarui stage')
      }
      toast.success('Stage buyer berhasil disinkronkan')
    } catch {
      toast.error('Gagal memperbarui stage. Periksa koneksi.')
    }
  }

  // Quick WhatsApp Engagement Status Update
  async function handleWhatsAppStatusChange(buyerId: string, newStatus: WhatsAppStatus) {
    const today = new Date().toISOString().split('T')[0]
    setBuyers((prev) =>
      prev.map((b) => {
        if (b.id !== buyerId) return b
        const updatedNotes = encodeWhatsAppStatus(b.notes, newStatus, today)
        return { ...b, notes: updatedNotes }
      })
    )

    try {
      const res = await fetch('/api/crm/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: buyerId, channel: 'whatsapp', status: newStatus }),
      })

      if (!res.ok) {
        throw new Error('Gagal update status WhatsApp')
      }
      toast.success(`Status WhatsApp diperbarui ke: ${newStatus}`)
    } catch {
      toast.error('Gagal memperbarui status WhatsApp.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar: Grouping & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center gap-3">
        {/* Group By Selector (Streak Iconic Feature) */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
          <Layers className="w-3.5 h-3.5 text-[#1a472a]" />
          <span className="text-xs font-semibold text-gray-700">Group by:</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
            className="text-xs font-bold text-gray-900 bg-transparent outline-none cursor-pointer"
          >
            <option value="stage">Tahap Pipeline (Streak Style)</option>
            <option value="tier">Volume Tier (HORECA / Katering)</option>
            <option value="country">Wilayah / Kota</option>
            <option value="none">Tanpa Grouping (Flat)</option>
          </select>
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari perusahaan / PIC / email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a] bg-gray-50/50"
          />
        </div>

        {/* Filter Wilayah */}
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50/50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
        >
          <option value="">Semua Wilayah</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Filter Tier */}
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50/50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
        >
          <option value="">Semua Tier</option>
          <option value="tier_1">Tier 1: HORECA</option>
          <option value="tier_2">Tier 2: Catering</option>
          <option value="tier_3">Tier 3: Chain Resto</option>
          <option value="tier_4">Tier 4: Industrial</option>
        </select>
      </div>

      {/* Main Grouped Table Canvas */}
      {filteredBuyers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-sm font-medium">Tidak ada data buyer yang cocok dengan filter aktif.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedData.map((group) => {
            const isCollapsed = collapsedGroups[group.id] ?? false
            if (group.items.length === 0 && groupBy !== 'stage') return null

            return (
              <div
                key={group.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs transition-all"
              >
                {/* Group Header Banner (Streak collapsible style) */}
                <div
                  onClick={() => toggleGroupCollapse(group.id)}
                  className={`px-4 py-3 border-b border-gray-100 flex items-center justify-between cursor-pointer select-none border-l-4 ${
                    group.borderLeft || 'border-l-emerald-600'
                  } ${group.bgHeader || 'bg-gray-50/50'} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-sm font-bold text-gray-900 tracking-tight">{group.title}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        group.badgeClass || 'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {group.count} Prospek
                    </span>
                  </div>

                  <span className="text-xs text-gray-400 font-medium">
                    {isCollapsed ? 'Klik untuk membuka' : 'Klik untuk menutup'}
                  </span>
                </div>

                {/* Group Table Rows */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    {group.items.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400">
                        Belum ada buyer pada kelompok ini.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                            <th className="px-4 py-2.5">Perusahaan & Wilayah</th>
                            <th className="px-4 py-2.5">Tahap Pipeline (Inline)</th>
                            <th className="px-4 py-2.5">Tier & Gacoan Fit</th>
                            <th className="px-4 py-2.5">Kontak & Status WhatsApp</th>
                            <th className="px-4 py-2.5 text-right">Aksi Penjualan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.items.map((b) => {
                            const currentStage = (b.pipeline_stage || getBuyerStage(b)) as PipelineStage
                            const currentTier = (b.buyer_tier || getBuyerTier(b)) as BuyerTier
                            const tierBadge = TIER_CONFIG[currentTier]
                            const score = getBuyerScore(b)
                            const waInfo = getWhatsAppVerificationInfo(b)
                            const { phoneCheck, waStatus, isLandline, isNotRegistered, isVerifiedActive, hasWhatsApp } = waInfo

                            return (
                              <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                                {/* Company & Country */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <Link
                                      href={`/buyers/${b.id}`}
                                      className="font-bold text-gray-900 hover:text-emerald-800 text-sm"
                                    >
                                      {b.company_name}
                                    </Link>
                                    {(b.kyc_verified || (b.notes || '').includes('[KYC: verified')) ? (
                                      <span
                                        title="B2B KYC Terverifikasi: Plafon Kredit Aktif"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                                      >
                                        🛡️ KYC
                                      </span>
                                    ) : (
                                      <span
                                        title="Belum KYC: Terkunci Cash Before Delivery (CBD)"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                      >
                                        🔒 CBD
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 text-gray-400">
                                    <span>{b.country || 'Indonesia'}</span>
                                    {b.payment_terms && <span>• {b.payment_terms}</span>}
                                  </div>
                                </td>

                                {/* Inline Pipeline Stage Selector (Streak Iconic UX) */}
                                <td className="px-4 py-3">
                                  <select
                                    value={currentStage}
                                    onChange={(e) =>
                                      handleInlineStageChange(b.id, e.target.value as PipelineStage)
                                    }
                                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-700 cursor-pointer shadow-2xs"
                                  >
                                    <option value="lead">01. Lead Baru</option>
                                    <option value="target_outreach">02. Target Outreach</option>
                                    <option value="sample_sent">03. Sample Sent</option>
                                    <option value="quotation_sent">04. SPH Sent</option>
                                    <option value="negotiation">05. In Negotiation</option>
                                    <option value="active_customer">06. Active Partner</option>
                                    <option value="closed_lost">07. Closed Lost</option>
                                  </select>
                                </td>

                                {/* Tier & Gacoan Score */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {tierBadge && (
                                      <span
                                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${tierBadge.className}`}
                                      >
                                        {tierBadge.label.split(':')[0]}
                                      </span>
                                    )}
                                    <span
                                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                        score >= 80
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : score >= 55
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}
                                    >
                                      {score}% Fit
                                    </span>
                                  </div>
                                </td>

                                {/* Contact Person, Phone Verification & Dynamic WhatsApp Icon */}
                                <td className="px-4 py-3">
                                  <p className="font-semibold text-gray-900 text-xs">{b.contact_name || 'PIC Belum Terdaftar'}</p>
                                  
                                  {/* Dynamic Icon: Verified WhatsApp vs Not-Registered vs Landline */}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {hasWhatsApp ? (
                                      <a
                                        href={`https://wa.me/${phoneCheck.formattedPhone}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={
                                          isVerifiedActive
                                            ? `WhatsApp Terverifikasi Aktif: ${phoneCheck.displayPhone} (${phoneCheck.operator || 'GSM'})`
                                            : `Buka WhatsApp: ${phoneCheck.displayPhone} (${phoneCheck.operator || 'GSM'})`
                                        }
                                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors ${
                                          isVerifiedActive
                                            ? 'text-emerald-800 bg-emerald-100/90 hover:bg-emerald-200 border-emerald-300 font-semibold shadow-2xs'
                                            : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                        }`}
                                      >
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span>{phoneCheck.displayPhone}</span>
                                        {isVerifiedActive && (
                                          <span className="text-[9px] text-emerald-900 bg-emerald-200/90 font-bold px-1 rounded flex items-center gap-0.5">
                                            ✓ Aktif
                                          </span>
                                        )}
                                        {phoneCheck.operator && (
                                          <span className="text-[9px] text-emerald-600 bg-emerald-100/70 px-1 rounded">
                                            {phoneCheck.operator}
                                          </span>
                                        )}
                                      </a>
                                    ) : isNotRegistered && !isLandline ? (
                                      <a
                                        href={`tel:${b.phone}`}
                                        title="Nomor ini tidak terdaftar di WhatsApp. Klik untuk memanggil via telepon suara."
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 transition-colors"
                                      >
                                        <PhoneOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                        <span>{phoneCheck.displayPhone || b.phone}</span>
                                        <span className="text-[9px] font-bold text-rose-800 bg-rose-200/80 px-1 rounded">
                                          ✕ Bukan WA
                                        </span>
                                      </a>
                                    ) : isLandline ? (
                                      <a
                                        href={`tel:${b.phone}`}
                                        title={phoneCheck.message}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-colors"
                                      >
                                        <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                        <span>{phoneCheck.displayPhone}</span>
                                        <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">PSTN Kantor</span>
                                      </a>
                                    ) : (
                                      <span className="text-gray-400 text-[11px]">{b.phone || 'No Telp (-) '}</span>
                                    )}

                                    {b.email && (
                                      <a
                                        href={`mailto:${b.email}`}
                                        title={`Kirim email ke ${b.email}`}
                                        className="text-gray-400 hover:text-emerald-700 p-0.5"
                                      >
                                        <Mail className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>

                                  {/* WhatsApp Interaction & Verification Status Tracker */}
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-400 font-medium">Status WA:</span>
                                    <select
                                      value={waStatus.status}
                                      onChange={(e) =>
                                        handleWhatsAppStatusChange(b.id, e.target.value as WhatsAppStatus)
                                      }
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer focus:outline-none ${waStatus.badgeClass}`}
                                    >
                                      <option value="uncontacted">⚪ Belum Dicek / Dikontak</option>
                                      <option value="verified_active">🟢 ✓ Terverifikasi WA Aktif</option>
                                      <option value="not_registered">🔴 ✕ Bukan Nomor WA</option>
                                      <option value="sent">🔵 WA Terkirim</option>
                                      <option value="replied">🟢 Buyer Membalas</option>
                                      <option value="sample_requested">🟣 Minta Sampel</option>
                                      <option value="rejected">🟠 Nego / Pending</option>
                                    </select>
                                    {waStatus.date && (
                                      <span className="text-[9px] text-gray-400">({waStatus.date})</span>
                                    )}
                                  </div>
                                </td>

                                {/* Action Buttons */}
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isNotRegistered || isLandline ? (
                                      <button
                                        type="button"
                                        onClick={() => setActiveWhatsAppBuyer(b)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                                        title="Bukan nomor WhatsApp - Buka untuk panggilan telepon atau lihat skrip"
                                      >
                                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                                        <span>Telepon / Skrip</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setActiveWhatsAppBuyer(b)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs active:scale-95"
                                        title="Buka Skrip Penawaran & Hubungi via WhatsApp"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                                        <span>WA Penawaran</span>
                                      </button>
                                    )}
                                    <Link
                                      href={`/quotations/new?buyer_id=${b.id}`}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-gray-50 hover:bg-emerald-50 border border-gray-200 rounded-lg transition-colors"
                                    >
                                      <FileText className="w-3 h-3 text-gray-500" /> + SPH
                                    </Link>
                                    <Link
                                      href={`/buyers/${b.id}`}
                                      className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-900"
                                    >
                                      Detail →
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* WhatsApp Sales Outreach Modal */}
      {activeWhatsAppBuyer && (
        <WhatsAppOutreachModal
          isOpen={!!activeWhatsAppBuyer}
          onClose={() => setActiveWhatsAppBuyer(null)}
          buyer={buyers.find((item) => item.id === activeWhatsAppBuyer.id) || activeWhatsAppBuyer}
          onStatusUpdated={(buyerId, status) => {
            handleWhatsAppStatusChange(buyerId, status as WhatsAppStatus)
          }}
        />
      )}
    </div>
  )
}
