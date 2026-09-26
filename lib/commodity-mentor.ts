/**
 * HTRN Commodity Sales Mentor & Pricing Intelligence Engine
 * Designed for Founder/Directors navigating B2B spice sales, procurement psychology,
 * and technical quality decomposition (specifically Bawang Merah Goreng).
 */

export type CommodityMarketData = {
  commodityName: string
  itemCode: string
  // Static internal baseline (September 2026), NOT a live market feed.
  // Every consumer (UI card, cron briefing, MCP/bot tools) must surface this.
  isInternalEstimate: true
  dataSourceLabel: string
  rawMaterialSource: string
  rawFarmgatePricePerKg: number // Harga bawang merah basah petani Brebes
  shrinkageRatio: number // Rasio susut: butuh 3.8 kg basah untuk 1 kg goreng
  rawMaterialCostPerKgGoreng: number // Modal bahan mentah
  cookingOilAndProcessingCost: number // Minyak sawit, gas LPG, tenaga kerja, packing
  estimatedRealPureHpp: number // HPP murni riil tanpa tepung
  supplierHppModal: number // HPP Mas Parmin (Bogor): Rp 125.000
  negotiationFloorPrice: number // Batas bawah harga penawaran: Rp 140.000
  marketPriceRange: {
    lowUnadulteratedTraditional: number // Rp 95.000 - Rp 115.000 (tepung tinggi 15-25%)
    mediumCommercial: number // Rp 130.000 - Rp 145.000 (tepung 5-10%)
    highPureIndustrial: number // Rp 155.000 - Rp 175.000 (murni Haturan / OEM industri)
  }
  sellingTiers: {
    tier1_horeca: { volume: '100 - 499 kg', price: 165000, margin: 40000 }
    tier2_catering: { volume: '500 - 999 kg', price: 155000, margin: 30000 }
    tier3_industrial: { volume: '1.000 - 2.000 kg', price: 149000, margin: 24000 }
    tier4_enterprise: { volume: '> 2.000 kg', price: 144000, margin: 19000 }
  }
  seasonalHarvestOutlook: string
}

export function getCurrentBawangGorengMarketData(): CommodityMarketData {
  // Baseline panen Brebes & Nganjuk saat ini (Rp 28.000 - Rp 32.000 / kg mentah)
  const rawPrice = 30000
  const shrinkageRatio = 3.8
  const rawCost = Math.round(rawPrice * shrinkageRatio) // ~Rp 114.000
  const processingCost = 11000 // Minyak, gas, listrik sentrifugal, tenaga kupas, kardus & bal PE
  const realHpp = rawCost + processingCost // ~Rp 125.000

  return {
    commodityName: 'Bawang Merah Goreng (Fried Shallots)',
    itemCode: 'bawang_goreng',
    isInternalEstimate: true,
    dataSourceLabel: 'Estimasi Acuan Internal (Baseline September 2026 - Bukan Live API Feed)',
    rawMaterialSource: 'Sentra Brebes Super & Sumenep Asli (Jawa Tengah & Madura)',
    rawFarmgatePricePerKg: rawPrice,
    shrinkageRatio,
    rawMaterialCostPerKgGoreng: rawCost,
    cookingOilAndProcessingCost: processingCost,
    estimatedRealPureHpp: realHpp,
    supplierHppModal: 125000,
    negotiationFloorPrice: 140000,
    marketPriceRange: {
      lowUnadulteratedTraditional: 105000,
      mediumCommercial: 135000,
      highPureIndustrial: 165000,
    },
    sellingTiers: {
      tier1_horeca: { volume: '100 - 499 kg', price: 165000, margin: 40000 },
      tier2_catering: { volume: '500 - 999 kg', price: 155000, margin: 30000 },
      tier3_industrial: { volume: '1.000 - 2.000 kg', price: 149000, margin: 24000 },
      tier4_enterprise: { volume: '> 2.000 kg', price: 144000, margin: 19000 },
    },
    seasonalHarvestOutlook:
      'Pasokan Brebes stabil; curah hujan sedang menjaga kualitas umbi berdiameter 2.5-3.5 cm dengan kadar air optimal. Mas Parmin Bogor mengamankan kontrak pasokan langsung dari petani sehingga fluktuasi pasar induk harian tidak mengganggu harga modal Rp 125.000/kg.',
  }
}

export type CompetitorAnalysisResult = {
  competitorPrice: number
  priceDifference: number // Positif jika Haturan lebih mahal
  estimatedFlourPercentage: string
  oilDrainageMethod: string
  shelfLifeEstimate: string
  technicalAnalysis: string
  buyerPitchScript: string
  kitchenYieldSavingsExplanation: string
  recommendedStrategy: 'stand_firm' | 'offer_tier_upgrade' | 'send_sample_qc' | 'walk_away'
}

/**
 * Smart Competitor Offer Analyzer
 * Decomposes why a competitor's price is lower and arms the founder with mathematical arguments
 */
export function analyzeCompetitorOffer(
  competitorPrice: number,
  targetTierPrice: number = 165000
): CompetitorAnalysisResult {
  const priceDiff = targetTierPrice - competitorPrice
  let flourEstimate = '< 0.5% (Murni)'
  let oilMethod = 'Spinner Sentrifugal Otomatis (De-oiling)'
  let shelfLife = '6 - 12 Bulan (Tidak Tengik)'
  let technicalAnalysis = ''
  let strategy: 'stand_firm' | 'offer_tier_upgrade' | 'send_sample_qc' | 'walk_away' = 'send_sample_qc'

  if (competitorPrice < 115000) {
    flourEstimate = '15% - 25% Campuran Tepung Terigu/Tapioka'
    oilMethod = 'Tiris Gravitasi Manual (Kandungan minyak residu > 18%)'
    shelfLife = '3 - 5 Minggu (Cepat bau apek/tengik)'
    technicalAnalysis =
      'Harga di bawah Rp 115.000/kg secara matematis TIDAK MUNGKIN murni, karena modal bahan mentah bawang basah Brebes saja sudah Rp 114.000/kg (rasio susut 3.8x). Supplier ini menekan harga dengan menyalut irisan bawang dalam adonan tepung tebal (15-25%) dan menggunakan minyak curah tiris manual.'
    strategy = 'send_sample_qc'
  } else if (competitorPrice < 135000) {
    flourEstimate = '5% - 12% Campuran Tepung'
    oilMethod = 'Tiris Sederhana / Centrifugal Singkat'
    shelfLife = '2 - 3 Bulan'
    technicalAnalysis =
      'Harga Rp 115.000 - Rp 135.000/kg biasanya merupakan varietas campuran lokal bertepung tipis atau harga Loco gudang asal (ongkos kirim ke Jabodetabek/Bandung dan risiko susut di jalan belum termasuk). Seringkali masih menyisakan minyak residu yang membuat bawang cepat layu saat terkena uap kuah panas.'
    strategy = 'offer_tier_upgrade'
  } else if (competitorPrice <= 150000) {
    flourEstimate = '1% - 3% (Mutu Standar Pasar)'
    oilMethod = 'Sentrifugal Standard'
    shelfLife = '4 - 6 Bulan'
    technicalAnalysis =
      'Kompetitor berada di segmen mutu komersial menengah. Perbedaan dengan Haturan biasanya terletak pada konsistensi irisan (banyak serpihan remah/remuk dibanding irisan utuh) dan ketiadaan jaminan Franco (bebas ongkir & tukar barang cacat).'
    strategy = 'stand_firm'
  } else {
    flourEstimate = '< 0.5% (Murni Mutu Industri)'
    oilMethod = 'Sentrifugal Penuh (FFA < 0.5%)'
    shelfLife = '6 - 12 Bulan'
    technicalAnalysis =
      'Kompetitor berada pada level mutu premium yang setara. Haturan dapat bersaing pada kecepatan pengiriman (lead time 3 hari dari hub Bogor), syarat pembayaran CBD terverifikasi ke TOP, dan dukungan dokumen legalitas (TDS, halal, sertifikat uji).'
    strategy = 'stand_firm'
  }

  // The Kitchen Yield Calculation
  const kitchenYieldSavingsExplanation = `
Perhitungan Efisiensi Dapur (Kitchen Yield Advantage):
• Bawang murah (tepung 20% & minyak lembap): Saat ditabur ke atas kuah panas (misal mangkok bakso/mie), bawang menyerap uap dan menjadi lembek/tenggelam dalam waktu < 2 menit. Koki/staf dapur cenderung menabur 5-6 gram per mangkok agar aroma tetap terasa.
• Bawang Haturan (kadar air < 3%, tiris sentrifugal): Irisan renyah mengapung di atas kuah dan tetap garing hingga tetes terakhir. Cukup 2.5 - 3 gram per mangkok.
• Kesimpulan Finansial: Resto dengan penjualan 1.000 mangkok/hari hanya membutuhkan 3 kg Bawang Haturan (Rp 495.000/hari) dibanding 5.5 kg bawang tepung murah (Rp 605.000/hari). Resto justru MENGHEMAT Rp 110.000 setiap hari atau Rp 3.300.000 per bulan!
`.trim()

  // Pitching Script for the Founder
  const buyerPitchScript = `
"Yth. Bapak/Ibu Tim Pengadaan,

Kami sangat memahami bahwa di pasaran terdapat penawaran di kisaran Rp ${competitorPrice.toLocaleString('id-ID')}/kg. Namun mohon izin kami sampaikan perbandingan teknis di tingkat dapur:

1. Rasio Murni Tanpa Tepung (< 0.5%): Produk kami adalah irisan murni Brebes & Sumenep asli, bukan adonan tepung. Di mangkok mie/bakso, irisan mengapung dan tetap renyah tahan lama, sehingga staf dapur tidak perlu menabur porsi berlebih.
2. Tiris Minyak Sentrifugal Otomatis (FFA < 0.5%): Tiris sempurna membuat produk tahan disimpan hingga 6-12 bulan tanpa khawatir bau tengik yang bisa merusak reputasi rasa menu Bapak/Ibu.
3. Garansi Franco Jabodetabek/Bandung: Harga kami sudah bebas ongkir sampai ke pintu dapur/gudang Bapak/Ibu dengan jaminan tukar baru 100% jika ada ketidaksesuaian mutu.

Di perhitungan biaya riil per porsi mangkok saji (cost-per-portion), produk kami terbukti menghemat pemakaian dapur hingga 30%.

Kami sangat percaya diri dengan mutu ini. Apakah berkenan kami kirimkan paket sampel gratis 250 gram besok untuk langsung diuji coba oleh tim QC dan Chef di dapur Bapak/Ibu?"
`.trim()

  return {
    competitorPrice,
    priceDifference: priceDiff,
    estimatedFlourPercentage: flourEstimate,
    oilDrainageMethod: oilMethod,
    shelfLifeEstimate: shelfLife,
    technicalAnalysis,
    buyerPitchScript,
    kitchenYieldSavingsExplanation,
    recommendedStrategy: strategy,
  }
}

/**
 * Master Sales Objections Library for Founder
 */
export const SALES_OBJECTIONS_PLAYBOOK = [
  {
    id: 'objection_price_too_high',
    question: 'Buyer berkata: "Harga dari supplier sebelah lebih murah Rp 20.000 - Rp 30.000 per kg."',
    coreReason: 'Buyer mengira semua bawang goreng sama saja dan hanya membandingkan angka bruto per kilogram di faktur.',
    founderAdvice:
      'Jangan langsung memotong harga! Di bisnis rempah olahan, pemotongan harga akan mengorbankan margin modal Anda. Alihkan fokus buyer dari "Harga Beli per Kg" ke "Biaya Pemakaian per Porsi Makanan (Cost per Bowl)".',
    script:
      '"Pak/Bu, harga per kg di faktur memang terlihat berbeda Rp 25.000. Namun bawang murah biasanya mengandung 15-20% tepung dan minyak residu yang berat. Saat ditabur ke makanan berkuah, bawang tersebut cepat layu dan tenggelam, sehingga dapur harus menabur 2 kali lebih banyak. Dengan Haturan yang tiris sentrifugal, taburan 3 gram sudah harum dan renyah. Resto mitra kami justru menghemat jutaan rupiah per bulan karena pemakaian lebih irit."',
  },
  {
    id: 'objection_request_immediate_top',
    question: 'Buyer berkata: "Kami biasa beli dengan tempo pembayaran (TOP) 30 hari. Kalau harus cash (CBD) kami tidak bisa."',
    coreReason: 'Buyer ingin menggunakan dana supplier untuk modal kerja mereka atau memiliki SOP purchasing korporat.',
    founderAdvice:
      'Sebagai founder pemula, JANGAN PERNAH berikan tempo 30 hari di pesanan pertama kepada buyer yang belum diverifikasi KYC. Risiko gagal bayar komoditas sangat fatal. Tawarkan kompromi jaminan mutu dan split payment.',
    script:
      '"Kami sangat menghormati kebijakan pengadaan di perusahaan Bapak/Ibu. Untuk kemitraan jangka panjang, PT Haturan Spice Indonesia menyediakan fasilitas TOP 14 hingga 30 hari dengan plafon kredit resmi setelah audit KYC disetujui. Untuk pesanan perdana (trial order 100-300 kg), kami menerapkan syarat CBD dengan garansi tukar produk 100% jika mutu tidak sesuai sampel. Setelah pesanan pertama lancar, pesanan kedua dan seterusnya otomatis dapat menggunakan fasilitas TOP."',
  },
  {
    id: 'objection_existing_supplier',
    question: 'Buyer berkata: "Kami sudah punya supplier langganan bertahun-tahun dan tidak ada masalah."',
    coreReason: 'Buyer enggan repot mengubah rantai pasok yang sudah berjalan (status quo bias).',
    founderAdvice:
      'Jangan menjelek-jelekkan supplier lama mereka. Posisikan Haturan sebagai "Mitra Pasokan Cadangan (Secondary Backup Supplier)" untuk mengantisipasi saat supplier utama mereka kehabisan stok panen atau mengalami kenaikan harga.',
    script:
      '"Kami sangat senang Bapak/Ibu sudah memiliki mitra pasokan yang baik. Kehadiran kami bukan untuk menggantikan supplier utama Bapak/Ibu, melainkan sebagai vendor cadangan (backup supplier) yang siap menjaga kelancaran dapur ketika ada lonjakan pesanan atau gangguan stok musiman. Izinkan kami mengirimkan sampel 250g untuk dicicipi tim dapur sebagai pembanding standar cadangan Bapak/Ibu."',
  },
  {
    id: 'objection_sample_follow_up',
    question: 'Bagaimana cara follow-up yang sopan setelah sampel 250g dikirim ke buyer?',
    coreReason: 'Chef atau procurement sering sibuk dan menunda mencoba sampel jika tidak diingatkan secara terstruktur.',
    founderAdvice:
      'Follow-up di hari ke-3 setelah sampel diterima ekspedisi. Jangan hubungi di jam sibuk resto (11:30 - 13:30). Hubungi di jam 14:30 - 16:00 WIB saat dapur sedang santai.',
    script:
      '"Selamat sore Pak/Bu [Nama PIC], semoga operasional dapur hari ini berjalan lancar. Sekadar mengonfirmasi, paket sampel Bawang Merah Goreng Haturan 250g kami perkirakan sudah tiba di lokasi Bapak/Ibu kemarin. Apakah sampelnya sudah sempat diuji coba tabur oleh tim Chef? Kami siap mendengar masukan organoleptik dari Bapak/Ibu."',
  },
]

export type PublicMarketBenchmark = {
  syncDate: string
  syncTimestamp: string
  isInternalEstimate: boolean
  benchmarkReleaseDate: string
  dataSourceLabel: string
  rawShallotKramatJati: {
    pricePerKg: number
    previousPricePerKg: number
    pctChange: number
    trend: 'up' | 'down' | 'stable'
    unit: string
    marketName: string
  }
  rawShallotBapanasNational: {
    pricePerKg: number
    previousPricePerKg: number
    pctChange: number
    trend: 'up' | 'down' | 'stable'
    unit: string
    marketName: string
  }
  cookingOilCurah: {
    pricePerLiter: number
    trend: 'up' | 'down' | 'stable'
  }
  shrinkageRatio: number
  equivalentRawMaterialCost: number
  sources: Array<{
    institution: string
    name: string
    shortCode: string
    url: string
    updateFrequency: string
    description: string
  }>
}

export function getPublicMarketBenchmarks(): PublicMarketBenchmark {
  const benchmarkReleaseDate = 'September 2026'
  const dataSourceLabel = 'Estimasi Acuan Internal (Baseline September 2026 - Bukan Live API Feed)'

  // Kramat Jati raw shallot wholesale price: Rp 28.500/kg (previous: Rp 27.500, +3.6%)
  const kramatJatiPrice = 28500
  const kramatJatiPrev = 27500
  const kramatJatiPct = Number((((kramatJatiPrice - kramatJatiPrev) / kramatJatiPrev) * 100).toFixed(1))

  // Bapanas national producer / wholesale average: Rp 29.200/kg (previous: Rp 28.700, +1.7%)
  const bapanasPrice = 29200
  const bapanasPrev = 28700
  const bapanasPct = Number((((bapanasPrice - bapanasPrev) / bapanasPrev) * 100).toFixed(1))

  const shrinkageRatio = 3.8
  const equivalentRawCost = Math.round(kramatJatiPrice * shrinkageRatio) // ~Rp 108.300 / kg goreng

  return {
    syncDate: '2026-09-21',
    syncTimestamp: 'Acuan Rilis: 21 September 2026',
    isInternalEstimate: true,
    benchmarkReleaseDate,
    dataSourceLabel,
    rawShallotKramatJati: {
      pricePerKg: kramatJatiPrice,
      previousPricePerKg: kramatJatiPrev,
      pctChange: kramatJatiPct,
      trend: kramatJatiPct > 0 ? 'up' : kramatJatiPct < 0 ? 'down' : 'stable',
      unit: 'kg basah',
      marketName: 'Pasar Induk Kramat Jati (DKI Jakarta)',
    },
    rawShallotBapanasNational: {
      pricePerKg: bapanasPrice,
      previousPricePerKg: bapanasPrev,
      pctChange: bapanasPct,
      trend: bapanasPct > 0 ? 'up' : bapanasPct < 0 ? 'down' : 'stable',
      unit: 'kg grosir nasional',
      marketName: 'Panel Harga Pangan Nasional (Bapanas RI)',
    },
    cookingOilCurah: {
      pricePerLiter: 16500,
      trend: 'stable',
    },
    shrinkageRatio,
    equivalentRawMaterialCost: equivalentRawCost,
    sources: [
      {
        institution: 'Badan Pangan Nasional (BAPANAS)',
        name: 'Panel Harga Pangan RI',
        shortCode: 'BAPANAS',
        url: 'https://panelharga.badanpangan.go.id',
        updateFrequency: 'Harian (Senin - Jumat)',
        description: 'Data resmi harga produsen, grosir, dan konsumen se-Indonesia dari enumerator pemerintah.',
      },
      {
        institution: 'Perumda Pasar Jaya DKI',
        name: 'Info Pangan Jakarta (IPJ)',
        shortCode: 'IPJ Kramat Jati',
        url: 'https://infopangan.jakarta.go.id',
        updateFrequency: 'Setiap Hari 09:00 WIB',
        description: 'Barometer harga riil grosir Pasar Induk Kramat Jati yang menjadi acuan distribusi rempah Jabodetabek.',
      },
      {
        institution: 'Bank Indonesia (BI)',
        name: 'Pusat Informasi Harga Pangan Strategis (PIHPS)',
        shortCode: 'PIHPS',
        url: 'https://hargapangan.id',
        updateFrequency: 'Harian Jam Kerja',
        description: 'Pemantauan komoditas strategis nasional Bank Indonesia untuk stabilitas inflasi pangan.',
      },
    ],
  }
}

