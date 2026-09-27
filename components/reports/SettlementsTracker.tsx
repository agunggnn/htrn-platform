'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Banknote,
  Truck,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  FileText,
  TrendingUp,
  Package,
  Layers,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SupplierSettlement, SettlementStatus } from '@/types'
import { generateMasParminSpkWhatsAppText } from '@/lib/fulfillment-helper'

type SummaryStats = {
  totalTransactions: number
  totalVolumeKg: number
  totalRevenue: number
  totalSupplierHpp: number
  totalPackagingCost: number
  totalDeliveryCost: number
  totalGrossProfit: number
  avgGrossMarginPct: number
  totalPendingPayout: number
  totalSettledPayout: number
}

type Props = {
  initialSettlements: SupplierSettlement[]
  initialSummary: SummaryStats
}

const STATUS_BADGES: Record<
  SettlementStatus,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: 'Menunggu Pelunasan Buyer (CBD)',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    icon: Clock,
  },
  approved: {
    label: 'Disetujui / Siap Kirim SPK',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    icon: CheckCircle2,
  },
  in_progress: {
    label: 'Dalam Pengiriman Armada',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-800',
    icon: Truck,
  },
  paid: {
    label: 'Modal Supplier Dicairkan',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-800',
    icon: Banknote,
  },
  reconciled: {
    label: 'Rekonsiliasi Selesai',
    bg: 'bg-green-50 border-green-200',
    text: 'text-green-900',
    icon: ShieldCheck,
  },
}

function getTargetReadyDate(settlementDate?: string | null): string {
  if (settlementDate) return settlementDate
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

function getSpkNumber(s: SupplierSettlement): string {
  const yr = new Date().getFullYear()
  const tail = (s.settlement_number || s.id).slice(-6).toUpperCase()
  return `SPK/MP/${yr}/${tail}`
}

export function SettlementsTracker({ initialSettlements, initialSummary }: Props) {
  const [settlements, setSettlements] = useState<SupplierSettlement[]>(initialSettlements)
  const summary = initialSummary
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'paid'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSettlement, setSelectedSettlement] = useState<SupplierSettlement | null>(null)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<SettlementStatus>('in_progress')
  const [bankRef, setBankRef] = useState('')
  const [settlementDate, setSettlementDate] = useState('2026-09-30')
  const [isUpdating, setIsUpdating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n)

  const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n)

  const filteredSettlements = settlements.filter((s) => {
    // Filter by tab
    if (activeTab === 'pending' && !(s.status === 'pending' || s.status === 'approved')) return false
    if (activeTab === 'in_progress' && s.status !== 'in_progress') return false
    if (activeTab === 'paid' && !(s.status === 'paid' || s.status === 'reconciled')) return false

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchNumber = s.settlement_number.toLowerCase().includes(q)
      const matchSupplier = s.suppliers?.name?.toLowerCase().includes(q)
      const matchBuyer = s.buyers?.company_name?.toLowerCase().includes(q)
      const matchCommodity = s.commodity_name.toLowerCase().includes(q)
      if (!matchNumber && !matchSupplier && !matchBuyer && !matchCommodity) return false
    }

    return true
  })

  function handleCopySpk(s: SupplierSettlement) {
    const spkNo = getSpkNumber(s)
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.haturan.com'
    const suratJalanUrl = `${appUrl}/api/pdf/surat-jalan/${s.quotation_id || s.id}`

    const text = generateMasParminSpkWhatsAppText({
      spkNumber: spkNo,
      quotationNumber: s.quotations?.quo_number || 'QUO/2026/09/001',
      commodityName: s.commodity_name,
      gradeCode: s.grade_code || 'GRADE_A_SLICE',
      gradeName: 'Grade A Slice Renyah (Brebes Super Murni)',
      quantityKg: s.volume_kg,
      unitSellingPrice: s.selling_price_per_kg,
      readyDateWib: getTargetReadyDate(s.settlement_date),
      buyerCompany: s.buyers?.company_name || 'Buyer',
      buyerPic: s.buyers?.contact_name || 'Tim Pengadaan Dapur',
      buyerPhone: s.buyers?.phone || '',
      buyerDeliveryAddress: s.buyers?.country ? `Area ${s.buyers.country} (Franco)` : 'Franco Bandung',
      suratJalanUrl,
      specialNotes: 'Kemasan polos bal 5kg ganda PE. Driver wajib membawa lembar Surat Jalan resmi Haturan.',
    })

    navigator.clipboard.writeText(text)
    setCopiedId(s.id)
    toast.success('Format instruksi WhatsApp SPK Mas Parmin disalin ke clipboard!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  async function handleUpdateStatus() {
    if (!selectedSettlement) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/settlements/${selectedSettlement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          bank_reference: bankRef || undefined,
          settlement_date: settlementDate,
          notes: `Status diperbarui ke ${newStatus}. Bank Ref: ${bankRef || '-'}`,
        }),
      })

      if (!res.ok) {
        throw new Error('Gagal memperbarui status settlement')
      }

      // Update local state
      setSettlements((prev) =>
        prev.map((item) =>
          item.id === selectedSettlement.id
            ? {
                ...item,
                status: newStatus,
                bank_reference: bankRef || item.bank_reference,
                settlement_date: settlementDate,
              }
            : item
        )
      )

      toast.success(`Status settlement ${selectedSettlement.settlement_number} berhasil diperbarui!`)
      setIsUpdateModalOpen(false)
      setSelectedSettlement(null)
      setBankRef('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Overview & SOP Flow */}
      <div className="rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-[#1a472a] to-[#256139] p-6 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              SOP Asset-Light Trading PT Haturan Spice Indonesia
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight">
              Bagi Hasil & Settlement Hub Mas Parmin (Bogor)
            </h2>
            <p className="mt-1 text-xs text-emerald-100/90 leading-relaxed max-w-2xl">
              Pencatatan real-time arus kas kemitraan maklon dan sortasi. Dana modal Mas Parmin (Rp 125.000/kg)
              dikunci dan dicairkan pasca verifikasi pelunasan invoice buyer (CBD) dan tanda tangan BAST serah terima.
            </p>
          </div>
          <div className="flex flex-col items-end justify-center rounded-xl bg-black/20 p-4 backdrop-blur-sm border border-white/10">
            <span className="text-xs text-emerald-200">Total Omset Penjualan Terkunci</span>
            <span className="text-2xl font-black text-white">{fmt(summary.totalRevenue)}</span>
            <span className="text-xs text-emerald-300 font-medium mt-0.5">
              Volume: {fmtNum(summary.totalVolumeKg)} kg ({fmtNum(summary.totalVolumeKg / 5)} bal / {fmtNum(summary.totalVolumeKg / 20)} box)
            </span>
          </div>
        </div>

        {/* Workflow Checklist Bar */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-lg">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-bold text-[#1a472a] text-[10px]">1</span>
            <span className="font-medium text-emerald-50">Pelunasan Buyer (CBD)</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-lg">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-bold text-[#1a472a] text-[10px]">2</span>
            <span className="font-medium text-emerald-50">SPK Mas Parmin & SJ</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-lg">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-bold text-[#1a472a] text-[10px]">3</span>
            <span className="font-medium text-emerald-50">Blind Shipping & BAST</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 p-2.5 rounded-lg">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-bold text-[#1a472a] text-[10px]">4</span>
            <span className="font-medium text-emerald-50">Pencairan Modal Rp 125k</span>
          </div>
        </div>
      </div>

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Alokasi Modal Supplier</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">{fmt(summary.totalSupplierHpp)}</span>
            <p className="mt-1 text-xs text-gray-500">HPP Rp 125.000/kg (CV Daun Mas)</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kemasan & Logistik</span>
            <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900">
              {fmt(summary.totalPackagingCost + summary.totalDeliveryCost)}
            </span>
            <p className="mt-1 text-xs text-gray-500">
              Box Rp {fmtNum(summary.totalPackagingCost)} • Kirim Rp {fmtNum(summary.totalDeliveryCost)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Laba Kotor Bersih Haturan</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-700">{fmt(summary.totalGrossProfit)}</span>
            <p className="mt-1 text-xs font-semibold text-emerald-600">
              Margin Real: {summary.avgGrossMarginPct}%
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding Pencairan</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-700">{fmt(summary.totalPendingPayout)}</span>
            <p className="mt-1 text-xs text-amber-600">Menunggu serah terima BAST</p>
          </div>
        </div>
      </div>

      {/* 3. Search & Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Semua ({settlements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Menunggu Pelunasan ({settlements.filter((s) => s.status === 'pending' || s.status === 'approved').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('in_progress')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'in_progress'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Dalam Pengiriman ({settlements.filter((s) => s.status === 'in_progress').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paid')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'paid'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Dicairkan / Rekonsiliasi ({settlements.filter((s) => s.status === 'paid' || s.status === 'reconciled').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari no settlement, buyer, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs text-gray-900 placeholder:text-gray-400 focus:border-[#1a472a] focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
          />
        </div>
      </div>

      {/* 4. Settlements Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 pl-6 pr-3">No. Settlement</th>
                <th className="px-3 py-3.5">Buyer & Komoditas</th>
                <th className="px-3 py-3.5">Supplier (Hub Bogor)</th>
                <th className="px-3 py-3.5 text-right">Volume</th>
                <th className="px-3 py-3.5 text-right">Harga Jual / Nilai Invoice</th>
                <th className="px-3 py-3.5 text-right">Modal Mas Parmin</th>
                <th className="px-3 py-3.5 text-right">Laba Bersih</th>
                <th className="px-3 py-3.5 text-center">Status</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    Tidak ada data settlement yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((s) => {
                  const badge = STATUS_BADGES[s.status] || STATUS_BADGES.pending
                  const BadgeIcon = badge.icon
                  const quoId = s.quotation_id || s.id

                  return (
                    <tr key={s.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-medium text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#1a472a]">{s.settlement_number}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(s.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">
                            {s.buyers?.company_name || 'Bakso Boedjangan (CRP Group)'}
                          </span>
                          <span className="text-gray-500 text-[11px]">
                            {s.commodity_name} ({s.grade_code || 'Grade A'})
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">
                            {s.suppliers?.name || 'CV Daun Mas / Mas Parmin'}
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            Hub Sentul / Cimanggu Bogor
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-right font-medium text-gray-900">
                        <div className="flex flex-col items-end">
                          <span className="font-bold">{fmtNum(s.volume_kg)} kg</span>
                          <span className="text-[10px] text-gray-400">
                            {Math.ceil(s.volume_kg / 5)} bal • {Math.ceil(s.volume_kg / 20)} karton
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-gray-900">{fmt(s.total_buyer_payment)}</span>
                          <span className="text-[10px] text-gray-500">
                            @ {fmt(s.selling_price_per_kg)}/kg
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-blue-700">{fmt(s.net_supplier_payout)}</span>
                          <span className="text-[10px] text-gray-500">
                            @ {fmt(s.supplier_hpp_per_kg)}/kg
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-emerald-700">{fmt(s.platform_net_profit)}</span>
                          <span className="text-[10px] font-semibold text-emerald-600">
                            {s.gross_margin_pct}% margin
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.bg} ${badge.text}`}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-4 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Salin SPK WhatsApp */}
                          <button
                            type="button"
                            onClick={() => handleCopySpk(s)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                            title="Salin instruksi WhatsApp Mas Parmin"
                          >
                            {copiedId === s.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-gray-500" />
                            )}
                            SPK WA
                          </button>

                          {/* Cetak Surat Jalan */}
                          <Link
                            href={`/api/pdf/surat-jalan/${quoId}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                            title="Cetak Surat Jalan & BAST Blind Shipping"
                          >
                            <FileText className="h-3.5 w-3.5 text-gray-500" />
                            BAST
                          </Link>

                          {/* Tombol Update Status */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSettlement(s)
                              setNewStatus(s.status)
                              setBankRef(s.bank_reference || '')
                              setIsUpdateModalOpen(true)
                            }}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90 cursor-pointer"
                            style={{ backgroundColor: '#1a472a' }}
                          >
                            Kelola
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Update Status Modal */}
      {isUpdateModalOpen && selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900">
              Kelola Settlement: {selectedSettlement.settlement_number}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Perbarui status alur kerja transaksi, catat nomor referensi transfer bank, dan selesaikan bagi hasil.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">Status Settlement</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SettlementStatus)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
                >
                  <option value="pending">Menunggu Pelunasan Buyer CBD (Pending)</option>
                  <option value="approved">Disetujui / Siap Kirim SPK ke Mas Parmin (Approved)</option>
                  <option value="in_progress">Dalam Pengiriman Armada Mas Parmin (In Progress)</option>
                  <option value="paid">Modal Supplier Rp 125k Dicairkan (Paid)</option>
                  <option value="reconciled">Rekonsiliasi Selesai (Reconciled)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Nomor Referensi Bank / Bukti Transfer
                </label>
                <input
                  type="text"
                  placeholder="Contoh: BCA-TRX-89324881"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">Tanggal Transaksi / Pencairan</label>
                <input
                  type="date"
                  value={settlementDate}
                  onChange={(e) => setSettlementDate(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
                />
              </div>

              <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200/80 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Alokasi Modal Mas Parmin:</span>
                  <span className="font-bold text-gray-900">{fmt(selectedSettlement.net_supplier_payout)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Laba Kotor Bersih Haturan:</span>
                  <span className="font-bold text-emerald-700">{fmt(selectedSettlement.platform_net_profit)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleUpdateStatus}
                className="rounded-xl px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: '#1a472a' }}
              >
                {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
