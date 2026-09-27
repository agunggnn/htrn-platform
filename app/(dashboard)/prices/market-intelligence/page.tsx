import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Cpu, Download } from 'lucide-react'
import { MarketIntelligenceHub } from '@/components/prices/MarketIntelligenceHub'

export const dynamic = 'force-dynamic'

export default async function MarketIntelligencePage() {
  const supabase = await createClient()

  // 1. Fetch latest raw material price if recorded
  const { data: latestRaw } = await supabase
    .from('price_history')
    .select('price_per_unit')
    .eq('source_type', 'farmgate_raw')
    .order('price_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const rawPrice = latestRaw?.price_per_unit ? Number(latestRaw.price_per_unit) : 30000

  // 2. Fetch competitor & industry peer records from buyers
  const { data: competitors } = await supabase
    .from('buyers')
    .select('id, company_name, contact_name, phone, notes, source')
    .or('source.eq.Competitor / Industry Peer,notes.ilike.%COMPETITOR%')
    .order('company_name', { ascending: true })

  return (
    <div className="px-6 py-8 lg:px-8 max-w-[1600px] mx-auto">
      {/* Back Link */}
      <Link
        href="/prices"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog Harga
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Cpu className="h-7 w-7 text-[#1a472a]" />
            Dinamika Bahan Baku & Intelijen Pasar (JEV)
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Kalkulator dekomposisi biaya matematis HPP Mas Parmin berdasarkan fluktuasi panen bawang merah basah Brebes,
            penguncian batas aman negosiasi (Floor Price), dan pemantauan harga kompetitor riil (Mystery Shopping).
          </p>
        </div>

        <div>
          <a
            href="/api/export/prices"
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <Download className="h-4 w-4 text-gray-500" />
            Export Data Harga (CSV)
          </a>
        </div>
      </div>

      {/* Main Interactive Hub */}
      <MarketIntelligenceHub
        initialRawPrice={rawPrice}
        initialCompetitors={competitors || []}
      />
    </div>
  )
}
