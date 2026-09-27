'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Cpu,
  ShieldCheck,
  Save,
  Phone,
  MessageSquare,
  Building2,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  calculateDynamicPricingPipeline,
  type PricingPipelineResult,
} from '@/lib/pricing-pipeline'

type CompetitorRecord = {
  id: string
  company_name: string
  contact_name: string | null
  phone: string | null
  notes: string | null
  source: string | null
}

type Props = {
  initialRawPrice: number
  initialCompetitors: CompetitorRecord[]
}

export function MarketIntelligenceHub({
  initialRawPrice = 30000,
  initialCompetitors = [],
}: Props) {
  const [rawPrice, setRawPrice] = useState<number>(initialRawPrice)
  const [pipeline, setPipeline] = useState<PricingPipelineResult>(() =>
    calculateDynamicPricingPipeline({ rawFarmgatePricePerKg: initialRawPrice })
  )
  const [isSaving, setIsSaving] = useState(false)
  const [selectedComp, setSelectedComp] = useState<CompetitorRecord | null>(null)
  const [compQuotePrice, setCompQuotePrice] = useState('')
  const [compNotes, setCompNotes] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false)

  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n)

  function handleRawPriceChange(val: number) {
    setRawPrice(val)
    const updated = calculateDynamicPricingPipeline({ rawFarmgatePricePerKg: val })
    setPipeline(updated)
  }

  async function handleSaveActiveRawPrice() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/prices/market-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'raw_material',
          price_per_unit: rawPrice,
          notes: `Harga acuan bawang merah basah sentra Brebes di-update menjadi Rp ${rawPrice.toLocaleString('id-ID')}/kg`,
        }),
      })

      if (!res.ok) throw new Error('Gagal menyimpan harga acuan')

      toast.success(
        `Harga acuan bahan mentah Rp ${rawPrice.toLocaleString('id-ID')}/kg berhasil disimpan ke database!`
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveCompetitorQuote() {
    if (!selectedComp || !compQuotePrice) return
    setIsSubmittingQuote(true)
    try {
      const res = await fetch('/api/prices/market-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'competitor_quote',
          competitor_name: selectedComp.company_name,
          competitor_phone: selectedComp.phone,
          price_per_unit: Number(compQuotePrice),
          notes: compNotes,
        }),
      })

      if (!res.ok) throw new Error('Gagal mencatat harga kompetitor')

      toast.success(
        `Hasil mystery shopping untuk ${selectedComp.company_name} (Rp ${Number(compQuotePrice).toLocaleString('id-ID')}/kg) berhasil dicatat!`
      )
      setIsModalOpen(false)
      setSelectedComp(null)
      setCompQuotePrice('')
      setCompNotes('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmittingQuote(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 1. Header & Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <Link
          href="/prices"
          className="border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          Katalog & Histori Harga
        </Link>
        <Link
          href="/prices/market-intelligence"
          className="border-b-2 border-[#1a472a] px-4 py-2.5 text-xs font-bold text-[#1a472a] transition-colors"
        >
          Dinamika Bahan Baku & Intelijen Pasar
        </Link>
        <Link
          href="/prices/input"
          className="border-b-2 border-transparent px-4 py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          Input Harga Harian
        </Link>
      </div>

      {/* 2. Interactive Live Dynamic HPP Simulator */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Cpu className="h-3.5 w-3.5 text-emerald-600" />
              JEV Dynamic Cost Cascade Engine
            </div>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              Simulasi Dinamika Harga Bahan Mentah $\rightarrow$ HPP $\rightarrow$ Floor Price
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              Ketika harga panen bawang merah basah di Brebes/Pasar Induk berfluktuasi, kalkulator ini secara
              otomatis menghitung dampak susut ($3.8\times$), HPP modal Mas Parmin, batas aman negosiasi, dan 4 tier harga jual.
            </p>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveActiveRawPrice}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:opacity-90 disabled:opacity-50 cursor-pointer self-start md:self-auto"
            style={{ backgroundColor: '#1a472a' }}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan Acuan Aktif ke DB'}
          </button>
        </div>

        {/* Input & Slider Control */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center bg-gray-50/70 p-5 rounded-xl border border-gray-200/80">
          <div className="lg:col-span-5 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-800">
                Harga Bawang Merah Basah Petani (Brebes Super):
              </label>
              <span className="text-base font-black text-[#1a472a]">{fmt(rawPrice)}/kg</span>
            </div>
            <input
              type="range"
              min={18000}
              max={45000}
              step={500}
              value={rawPrice}
              onChange={(e) => handleRawPriceChange(Number(e.target.value))}
              className="w-full accent-[#1a472a] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Panen Raya: Rp 18.000</span>
              <span>Normal: Rp 30.000</span>
              <span>Paceklik: Rp 45.000</span>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-bold text-gray-400">Biaya Bahan Mentah (3.8x)</span>
              <p className="mt-1 text-base font-bold text-gray-800">
                {fmt(pipeline.rawMaterialCostPerKgGoreng)}
              </p>
              <span className="text-[10px] text-gray-400">3.8 kg basah = 1 kg goreng</span>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-bold text-blue-600">HPP Modal Mas Parmin</span>
              <p className="mt-1 text-base font-black text-blue-900">
                {fmt(pipeline.supplierHppModal)}
              </p>
              <span className="text-[10px] text-blue-700 font-medium">+ Biaya Olah Rp 11k/kg</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700">Floor Price (Batas Bawah)</span>
              <p className="mt-1 text-base font-black text-emerald-900">
                {fmt(pipeline.negotiationFloorPrice)}
              </p>
              <span className="text-[10px] text-emerald-700 font-medium">+ Floor Margin Rp 15k/kg</span>
            </div>
          </div>
        </div>

        {/* 4 Volume Selling Tiers Generated Automatically */}
        <div>
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
            Rekomendasi Harga Jual B2B Otomatis (Berdasarkan Skala Volume):
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(pipeline.sellingTiers).map(([key, tier]) => (
              <div
                key={key}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-2xs flex flex-col justify-between hover:border-[#1a472a] transition-colors"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-900">{tier.name.split(' - ')[1]}</span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                      {tier.volumeRange}
                    </span>
                  </div>
                  <div className="my-2">
                    <span className="text-xl font-black text-[#1a472a]">
                      {fmt(tier.recommendedPricePerKg)}
                    </span>
                    <span className="text-xs text-gray-400">/kg Franco</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">{tier.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs font-semibold">
                  <span className="text-gray-500">Gross Margin:</span>
                  <span className="text-emerald-700">
                    +{fmt(tier.grossMarginIdrPerKg)} ({tier.grossMarginPct}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Mathematical Pipeline Flow Diagram & Audit Specification */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#1a472a]" />
          <h3 className="text-sm font-bold text-gray-900">
            Spesifikasi Rumus Aliran Variabel & Guardrail JEV
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200/80">
            <span className="font-bold text-gray-900 block mb-1">1. Rasio Susut Panen</span>
            <code className="text-[#1a472a] font-mono font-semibold block mb-1">
              raw_cost = P_raw × 3.8
            </code>
            <p className="text-gray-500 text-[11px]">
              Kadar air bawang merah Brebes segar sekitar 73%. Dari 3,8 kg basah dihasilkan 1 kg irisan goreng murni.
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200/80">
            <span className="font-bold text-gray-900 block mb-1">2. Biaya Olah Sentrifugal</span>
            <code className="text-[#1a472a] font-mono font-semibold block mb-1">
              proc_cost = Rp 11.000/kg
            </code>
            <p className="text-gray-500 text-[11px]">
              Mencakup minyak sawit mutu industri, gas LPG, listrik spinner peniris minyak ganda, dan upah kupas/iris.
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200/80">
            <span className="font-bold text-gray-900 block mb-1">3. Batas Bawah Negosiasi</span>
            <code className="text-[#1a472a] font-mono font-semibold block mb-1">
              floor_price = HPP + Rp 15.000
            </code>
            <p className="text-gray-500 text-[11px]">
              JEV mengunci guardrail batas bawah agar tim sales dilarang menawar di bawah angka ini tanpa izin Direktur.
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 border border-gray-200/80">
            <span className="font-bold text-gray-900 block mb-1">4. Logika Anti-Boncos JEV</span>
            <code className="text-[#1a472a] font-mono font-semibold block mb-1">
              ERR_PRICE_BELOW_FLOOR
            </code>
            <p className="text-gray-500 text-[11px]">
              Jika harga bahan basah naik di pasar, JEV otomatis memperingatkan quotation lama yang margin-nya terancam.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Competitor Mystery Shopping & Intel Workspace */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <Lock className="h-3.5 w-3.5 text-amber-600" />
              Zona Karantina Kompetitor & Peer Industri
            </div>
            <h3 className="mt-2 text-base font-bold text-gray-900">
              Daftar Target Mystery Shopping (Tanya Harga via WA Pribadi Pak Agung)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Entitas di bawah ini adalah sesama pabrik seasoning / distributor. Dilarang dikirim penawaran harga Haturan.
              Gunakan kontak di bawah untuk menggali harga riil dan spesifikasi mereka.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50/75 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 pl-4 pr-3">Perusahaan / Entitas</th>
                <th className="px-3 py-3">Lokasi & Profil Asli</th>
                <th className="px-3 py-3">Kontak / WhatsApp</th>
                <th className="px-3 py-3">Spesifikasi Target</th>
                <th className="py-3 pl-3 pr-4 text-right">Aksi Intelijen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialCompetitors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    Tidak ada entitas kompetitor yang terdaftar.
                  </td>
                </tr>
              ) : (
                initialCompetitors.map((comp) => (
                  <tr key={comp.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 pl-4 pr-3 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>{comp.company_name}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-gray-600">
                      {comp.company_name.includes('Golden')
                        ? 'Katapang, Bandung (Pabrik Bumbu Tabur)'
                        : comp.company_name.includes('Kreasi')
                          ? 'Bekasi (Pabrik Seasoning & Premix)'
                          : comp.company_name.includes('Joze')
                            ? 'Bogor (Distributor Bahan HORECA)'
                            : comp.company_name.includes('AIMFOOD')
                              ? 'Cikarang MM2100 (Maklon OEM Pangan)'
                              : comp.company_name.includes('Karawang')
                                ? 'Cikarang (Bahan Baku Saus)'
                                : 'Bekasi (Produsen Bumbu Gurih)'}
                    </td>

                    <td className="px-3 py-3.5 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        <span>{comp.phone || '—'}</span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 text-gray-500 max-w-xs truncate">
                      {comp.company_name.includes('Golden')
                        ? 'Bawang bal 5kg & karung (cek tepung vs murni)'
                        : comp.company_name.includes('Kreasi')
                          ? 'Bawang slice & coarse ground'
                          : comp.company_name.includes('Joze')
                            ? 'Harga jual ke resto Bogor (benchmark lokal)'
                            : 'Bahan baku seasoning kaldu & saus'}
                    </td>

                    <td className="py-3.5 pl-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComp(comp)
                          setIsModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Catat Harga WA
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Mystery Shopping Quote */}
      {isModalOpen && selectedComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900">
              Catat Hasil Mystery Shopping: {selectedComp.company_name}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Simpan data harga riil yang berhasil Anda korek dari WhatsApp pribadi sebagai acuan tawar Haturan.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Harga Penawaran Kompetitor (Rp / kg)
                </label>
                <input
                  type="number"
                  placeholder="Contoh: 148000"
                  value={compQuotePrice}
                  onChange={(e) => setCompQuotePrice(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700">
                  Catatan Mutu / Spesifikasi Lapangan
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Harga Rp 148k Franco Bandung bal 5kg. Mengaku ada tepung 5%. Minyak agak basah."
                  value={compNotes}
                  onChange={(e) => setCompNotes(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none focus:ring-1 focus:ring-[#1a472a]"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingQuote || !compQuotePrice}
                onClick={handleSaveCompetitorQuote}
                className="rounded-xl px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: '#1a472a' }}
              >
                {isSubmittingQuote ? 'Menyimpan...' : 'Simpan Intelijen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
