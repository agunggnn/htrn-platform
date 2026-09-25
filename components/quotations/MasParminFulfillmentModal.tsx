'use client'

import { useState } from 'react'
import {
  X,
  Truck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Package,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  calculatePackagingBreakdown,
  calculateFulfillmentFinancials,
  generateMasParminSpkWhatsAppText,
} from '@/lib/fulfillment-helper'

export type MasParminFulfillmentModalProps = {
  isOpen: boolean
  onClose: () => void
  quotationId: string
  quotationNumber?: string
  buyerCompany: string
  buyerPic?: string
  buyerPhone?: string
  buyerAddress?: string
  initialQuantityKg?: number
  initialPricePerKg?: number
  commodityName?: string
  gradeName?: string
}

export function MasParminFulfillmentModal({
  isOpen,
  onClose,
  quotationId,
  quotationNumber = 'QUO-2026-001',
  buyerCompany,
  buyerPic = 'Tim Pengadaan / Kepala Dapur',
  buyerPhone = '',
  buyerAddress = 'Jabodetabek (Franco)',
  initialQuantityKg = 500,
  initialPricePerKg = 155000,
  commodityName = 'Bawang Merah Goreng',
  gradeName = 'Grade A Slice Renyah (Brebes Super)',
}: MasParminFulfillmentModalProps) {
  const [quantityKg, setQuantityKg] = useState<number>(initialQuantityKg || 500)
  const [sellingPrice, setSellingPrice] = useState<number>(initialPricePerKg || 155000)
  const [masParminPhone, setMasParminPhone] = useState<string>('6281234567890') // Mas Parmin Bogor contact
  const [copied, setCopied] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState(buyerAddress)
  const [currentStep, setCurrentStep] = useState<number>(2) // 1 = Draft, 2 = Ready to Send, 3 = Cooking, 4 = In Transit, 5 = Delivered

  // Compute default ready date (today + 3 business days)
  const defaultReadyDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return d.toISOString().split('T')[0]
  })()
  const [readyDate, setReadyDate] = useState(defaultReadyDate)

  if (!isOpen) return null

  const packaging = calculatePackagingBreakdown(quantityKg)
  const financials = calculateFulfillmentFinancials(quantityKg, sellingPrice)
  const spkNumber = `SPK/MP/${new Date().getFullYear()}/${(quotationNumber || quotationId).slice(-6).toUpperCase()}`
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.haturan.com'
  const suratJalanUrl = `${appUrl}/api/pdf/surat-jalan/${quotationId}`

  const whatsappMessage = generateMasParminSpkWhatsAppText({
    spkNumber,
    quotationNumber,
    commodityName,
    gradeCode: 'GRADE_A_SLICE',
    gradeName,
    quantityKg,
    unitSellingPrice: sellingPrice,
    readyDateWib: readyDate,
    buyerCompany,
    buyerPic,
    buyerPhone,
    buyerDeliveryAddress: deliveryAddress,
    suratJalanUrl,
    specialNotes: 'Kemasan wajib polos bal 5kg ganda PE. Surat Jalan Haturan wajib dibawa supir.',
  })

  function handleCopyWhatsApp() {
    navigator.clipboard.writeText(whatsappMessage)
    setCopied(true)
    toast.success('Format instruksi WhatsApp Mas Parmin berhasil disalin!')
    setTimeout(() => setCopied(false), 2500)
  }

  function handleOpenWhatsApp() {
    const cleanPhone = masParminPhone.replace(/\D/g, '')
    const targetUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`
    window.open(targetUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-2xl text-white shadow-xs shrink-0"
              style={{ backgroundColor: '#1a472a' }}
            >
              <Truck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  Fulfillment Desk Mas Parmin (Hub Sortasi Bogor)
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                  100% Asset-Light Maklon
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Delegasikan penggorengan sentrifugal & ekspedisi langsung ke Mas Parmin di Bogor dengan blind shipping resmi PT Haturan Spice Indonesia.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Pipeline */}
        <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            Status Alur Pengiriman Maklon:
          </p>
          <div className="grid grid-cols-5 gap-1.5 text-center text-[10px]">
            {[
              { step: 1, label: '1. Draft SPK' },
              { step: 2, label: '2. Kirim ke Mas Parmin' },
              { step: 3, label: '3. Goreng & Tiris (Bogor)' },
              { step: 4, label: '4. Armada Berangkat' },
              { step: 5, label: '5. Selesai (BAST Sah)' },
            ].map((s) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStep(s.step)}
                className={`py-1.5 px-1 rounded-xl font-bold transition-all cursor-pointer ${
                  currentStep >= s.step
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Financials & Gross Margin Lock (The Golden Card) */}
        <div
          className="rounded-2xl p-5 text-white shadow-sm space-y-3"
          style={{ backgroundColor: '#1a472a' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-300" />
              Penguncian Margin Kas Bersih (Locked Gross Margin):
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-900/80 text-emerald-100 rounded-md border border-emerald-700">
              Margin {financials.grossMarginPct}%
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-1">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <p className="text-[10px] text-emerald-200">Tagihan Masuk dari Buyer</p>
              <p className="text-base font-extrabold mt-0.5">
                Rp {financials.totalRevenue.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-emerald-200/80">
                @{sellingPrice.toLocaleString('id-ID')}/kg
              </p>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <p className="text-[10px] text-emerald-200">Modal Keluar ke Mas Parmin</p>
              <p className="text-base font-extrabold mt-0.5">
                Rp {financials.totalSupplierCost.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-emerald-200/80">
                HPP Modal @Rp 125.000/kg
              </p>
            </div>

            <div className="bg-emerald-400/20 p-3 rounded-xl border border-emerald-400/30">
              <p className="text-[10px] text-emerald-100 font-bold">Profit Bersih Haturan</p>
              <p className="text-lg font-black text-emerald-300 mt-0.5">
                +Rp {financials.grossProfitIdr.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-emerald-200">
                Tanpa sewa gudang / mesin
              </p>
            </div>
          </div>
        </div>

        {/* Order Inputs & Packaging Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Box Left: Inputs */}
          <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-200 space-y-3">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
              <Package className="w-3.5 h-3.5 text-emerald-700" />
              Sesuaikan Volume & Jadwal Kirim
            </h4>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-gray-500">Volume (Kg)</label>
                <input
                  type="number"
                  step="50"
                  value={quantityKg}
                  onChange={(e) => setQuantityKg(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-gray-500">Harga Jual Buyer (Rp)</label>
                <input
                  type="number"
                  step="1000"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Math.max(1, parseInt(e.target.value, 10) || 0))}
                  className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-900 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500">Target Tanggal Siap Kirim (H+3)</label>
              <input
                type="date"
                value={readyDate}
                onChange={(e) => setReadyDate(e.target.value)}
                className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 font-semibold text-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-gray-500">Alamat Dapur / Gudang Buyer</label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-gray-800 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-700"
                placeholder="Alamat lengkap tujuan Franco"
              />
            </div>
          </div>

          {/* Box Right: Packaging Breakdown */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              Spesifikasi Kemasan Mas Parmin
            </h4>

            <div className="space-y-2 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex justify-between items-center">
                <span className="text-gray-500 text-[11px]">Bal Ganda PE (5 kg):</span>
                <span className="font-bold text-emerald-900">{packaging.totalBals} bal</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex justify-between items-center">
                <span className="text-gray-500 text-[11px]">Master Carton Box (4 bal):</span>
                <span className="font-bold text-emerald-900">{packaging.totalMasterBoxes} karton</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex justify-between items-center">
                <span className="text-gray-500 text-[11px]">Alternatif Karung Zak Bulk:</span>
                <span className="font-bold text-emerald-900">{packaging.bulkSackCount} zak @ 25kg</span>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-emerald-100 text-[10.5px] text-emerald-800 leading-relaxed">
              💡 <strong>SOP Blind Shipping:</strong> Kemasan wajib polos atau menggunakan label PT Haturan Spice Indonesia. Mas Parmin membawa Surat Jalan resmi Haturan saat pengiriman ke <strong>{buyerCompany}</strong>.
            </div>
          </div>
        </div>

        {/* WhatsApp SPK Generator Box */}
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              Pratinjau SPK WhatsApp untuk Mas Parmin:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
                {copied ? 'Tersalin!' : 'Salin Pesan'}
              </button>
            </div>
          </div>

          <pre className="text-[11px] text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-xl font-mono leading-relaxed border border-gray-200 max-h-40 overflow-y-auto">
            {whatsappMessage}
          </pre>
        </div>

        {/* Action Buttons Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <a
            href={suratJalanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-gray-800 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-800" />
            Buka & Cetak Surat Jalan Resmi (PDF)
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
              style={{ backgroundColor: '#1a472a' }}
            >
              <Truck className="w-4 h-4 text-emerald-300" />
              Kirim SPK ke WhatsApp Mas Parmin
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
