'use client'

import { useState } from 'react'
import {
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  DollarSign,
  Scale,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getCurrentBawangGorengMarketData,
  analyzeCompetitorOffer,
  SALES_OBJECTIONS_PLAYBOOK,
  type CompetitorAnalysisResult,
} from '@/lib/commodity-mentor'

export function CommodityMentorCard() {
  const [marketData] = useState(() => getCurrentBawangGorengMarketData())
  const [competitorInput, setCompetitorInput] = useState<number>(115000)
  const [analysis, setAnalysis] = useState<CompetitorAnalysisResult>(() =>
    analyzeCompetitorOffer(115000)
  )
  const [copied, setCopied] = useState(false)
  const [loadingSync, setLoadingSync] = useState(false)
  const [expandedObjection, setExpandedObjection] = useState<string | null>(null)

  function handleCalculateCompetitor(price: number) {
    setCompetitorInput(price)
    setAnalysis(analyzeCompetitorOffer(price))
  }

  function handleCopyScript() {
    navigator.clipboard.writeText(analysis.buyerPitchScript)
    setCopied(true)
    toast.success('Skrip diplomatis berhasil disalin ke clipboard!')
    setTimeout(() => setCopied(false), 2500)
  }

  async function handleTriggerMarketSync() {
    setLoadingSync(true)
    try {
      const res = await fetch('/api/cron/market-prices', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal sinkronisasi')
      toast.success(`Harga pasar mingguan berhasil diperbarui (${json.date}).`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sinkronisasi harga pasar'
      toast.error(msg)
    } finally {
      setLoadingSync(false)
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 mb-8 space-y-6">
      {/* 1. Header Banner & Mentor Intro */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-start gap-3.5">
          <div
            className="p-3 rounded-2xl text-white shadow-xs shrink-0"
            style={{ backgroundColor: '#1a472a' }}
          >
            <Sparkles className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                HTRN Commodity Sales Mentor & Weekly Intelligence
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full">
                Eksklusif Founder
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
              Panduan mentor strategis komoditas rempah untuk membantu Anda menguasai psikologi pengadaan buyer, membedah struktur HPP riil bahan mentah, dan memenangkan negosiasi tanpa mengorbankan margin.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerMarketSync}
          disabled={loadingSync}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer self-start lg:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${loadingSync ? 'animate-spin' : ''}`} />
          {loadingSync ? 'Menyinkronkan...' : 'Sinkronkan Benchmark Pasar'}
        </button>
      </div>

      {/* 2. Three Pillars Overview: Bahan Mentah, HPP Mas Parmin, Floor Haturan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Box 1: Bahan Mentah Brebes */}
        <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400">01. Bahan Mentah Brebes</p>
          <p className="text-lg font-extrabold text-gray-900 mt-1">
            Rp {marketData.rawFarmgatePricePerKg.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-gray-500"> / kg basah</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            Rasio Susut: <strong>3.8 kg basah</strong> untuk 1 kg goreng murni.
          </p>
        </div>

        {/* Box 2: HPP Modal Supplier (Mas Parmin) */}
        <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100">
          <p className="text-[11px] font-semibold text-emerald-800">02. HPP Modal Mas Parmin (Bogor)</p>
          <p className="text-lg font-extrabold text-emerald-900 mt-1">
            Rp {marketData.supplierHppModal.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-emerald-700"> / kg</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">
            Sudah termasuk minyak sawit, tiris sentrifugal, bal PE ganda.
          </p>
        </div>

        {/* Box 3: Negotiation Floor (Batas Bawah Aman) */}
        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200">
          <p className="text-[11px] font-semibold text-amber-800">03. Batas Bawah Negosiasi (Floor)</p>
          <p className="text-lg font-extrabold text-amber-900 mt-1">
            Rp {marketData.negotiationFloorPrice.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-amber-700"> / kg</span>
          </p>
          <p className="text-[11px] text-amber-700 mt-1">
            <strong>Kunci Mati:</strong> Jangan beri harga di bawah angka ini (Margin min: Rp 15rb/kg).
          </p>
        </div>

        {/* Box 4: Rekomendasi Jual Tier 1 HORECA */}
        <div
          className="p-4 rounded-2xl text-white shadow-xs"
          style={{ backgroundColor: '#1a472a' }}
        >
          <p className="text-[11px] font-medium text-emerald-200">04. Harga Jual Tier 1 (HORECA)</p>
          <p className="text-lg font-extrabold text-white mt-1">
            Rp {marketData.sellingTiers.tier1_horeca.price.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-emerald-200"> / kg</span>
          </p>
          <p className="text-[11px] text-emerald-200 mt-1">
            Margin Bersih: <strong>+Rp 40.000/kg</strong> Franco Jabodetabek.
          </p>
        </div>
      </div>

      {/* 3. Simulator Dekomposisi Harga Kompetitor */}
      <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#1a472a]" />
            <h3 className="font-bold text-gray-900 text-sm">
              Simulator Penawaran: Mengapa Harga Supplier Sebelah Lebih Murah?
            </h3>
          </div>
          <span className="text-xs text-gray-500">
            Ketik harga yang ditawarkan kompetitor ke buyer Anda
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
            <span className="text-xs font-bold text-gray-600">Rp</span>
            <input
              type="number"
              step="5000"
              value={competitorInput}
              onChange={(e) => handleCalculateCompetitor(parseInt(e.target.value, 10) || 0)}
              className="text-sm font-extrabold text-gray-900 w-28 focus:outline-none"
            />
            <span className="text-xs text-gray-400">/ kg</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400">Pilihan Cepat:</span>
            {[105000, 115000, 125000, 135000, 145000].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleCalculateCompetitor(p)}
                className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                  competitorInput === p
                    ? 'bg-emerald-800 text-white border-emerald-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                Rp {(p / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* Decomposition Results Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-white p-3.5 rounded-xl border border-gray-200">
            <p className="text-gray-400 text-[10px] font-medium">Estimasi Campuran Tepung</p>
            <p className="font-extrabold text-amber-900 text-sm mt-0.5">
              {analysis.estimatedFlourPercentage}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Haturan murni (&lt; 0.5% tepung) tidak gosong di kuah panas.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200">
            <p className="text-gray-400 text-[10px] font-medium">Teknik Penirisan Minyak</p>
            <p className="font-extrabold text-gray-900 text-xs mt-0.5">
              {analysis.oilDrainageMethod}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Minyak residu tinggi memicu bau tengik dalam 3 minggu.
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-gray-200">
            <p className="text-gray-400 text-[10px] font-medium">Estimasi Masa Simpan (Shelf-Life)</p>
            <p className="font-extrabold text-gray-900 text-xs mt-0.5">
              {analysis.shelfLifeEstimate}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              Haturan tiris sentrifugal tahan 6-12 bulan tanpa pengawet.
            </p>
          </div>
        </div>

        {/* Technical Insight & Kitchen Yield */}
        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-950">
            <Lightbulb className="w-3.5 h-3.5 text-amber-700" />
            Rahasia Argumen Dapur (Kitchen Yield Advantage):
          </div>
          <p>{analysis.technicalAnalysis}</p>
          <div className="mt-2 pt-2 border-t border-amber-200/60 font-medium">
            💡 <strong>Rumus Menang:</strong> Resto yang memakai bawang murah justru boros karena menabur 5-6 gram per mangkok akibat bawang lembek terendam kuah. Dengan Haturan, taburan 3 gram sudah renyah mengapung. <em>Biaya per porsi saji Haturan terbukti lebih hemat Rp 120 per mangkok!</em>
          </div>
        </div>

        {/* Pitching Script Ready to Send */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
              Skrip Siap Kirim ke Buyer (WhatsApp / Email):
            </span>
            <button
              type="button"
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3 text-emerald-700" />}
              {copied ? 'Tersalin!' : 'Salin Skrip'}
            </button>
          </div>
          <pre className="text-[11px] text-gray-700 whitespace-pre-wrap bg-gray-50/70 p-3 rounded-lg font-sans leading-relaxed border border-gray-100">
            {analysis.buyerPitchScript}
          </pre>
        </div>
      </div>

      {/* 4. Sales Objections Playbook Accordion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-[#1a472a]" />
            Tanya Sales Mentor: 4 Trik & Keberatan Buyer Paling Sering Terjadi
          </h3>
          <span className="text-[11px] text-gray-400">Klik untuk melihat cara jawab</span>
        </div>

        <div className="space-y-2">
          {SALES_OBJECTIONS_PLAYBOOK.map((obj) => {
            const isExpanded = expandedObjection === obj.id
            return (
              <div
                key={obj.id}
                className="bg-gray-50/70 border border-gray-200 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setExpandedObjection(isExpanded ? null : obj.id)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 hover:bg-gray-100/70 transition-colors cursor-pointer select-none"
                >
                  <span className="text-xs font-bold text-gray-900">{obj.question}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-2.5 text-xs border-t border-gray-100 bg-white">
                    <div>
                      <p className="font-semibold text-gray-500 text-[10px]">Akar Alasan Buyer:</p>
                      <p className="text-gray-700">{obj.coreReason}</p>
                    </div>

                    <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <p className="font-bold text-emerald-900 text-[11px] mb-0.5">Saran Taktis Mentor:</p>
                      <p className="text-emerald-800 text-[11px] leading-relaxed">{obj.founderAdvice}</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="font-bold text-gray-800 text-[11px] mb-1">Skrip Kata Demi Kata yang Harus Anda Ucapkan:</p>
                      <p className="text-gray-700 italic text-[11px] leading-relaxed">{obj.script}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
