'use client'

import { useState, useMemo } from 'react'
import {
  Target,
  Sparkles,
  Calculator,
  MessageSquare,
  Copy,
  Check,
  Hotel,
  UtensilsCrossed,
  Factory,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

export type SegmentType = 'horeca' | 'resto_chain' | 'food_industry'

interface PersonaBattlecard {
  id: SegmentType
  title: string
  subtitle: string
  icon: typeof Hotel
  badgeColor: string
  targetBuyerPersona: string
  keyPainPoints: string[]
  valueProposition: string
  recommendedPackaging: string
  pricingGuidance: string
  proofPoints: string[]
  defaultTemplateId: string
}

const BATTLECARDS: PersonaBattlecard[] = [
  {
    id: 'horeca',
    title: 'HORECA & Hotel Bintang',
    subtitle: 'Hotel Bintang 3-5, Resort, Corporate Dining & High-end Catering',
    icon: Hotel,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    targetBuyerPersona: 'Executive Chef, F&B Director, Purchasing Hotel & Catering Manager',
    keyPainPoints: [
      'Bawang goreng curah pasar cepat apek dan tengik karena penirisan minyak tradisional.',
      'Bawang mudah lembek saat terkena uap makanan di kemasan box catering tertutup.',
      'Minyak berlebih mengotori plating makanan dan membuat tamu eneg.',
      'Pasokan tidak konsisten antara rasa asin dan warna gosong saat panen langka.',
    ],
    valueProposition:
      'Penirisan minyak sentrifugal kecepatan tinggi dengan kadar minyak bebas < 3% dan kadar air < 3%. Daya tahan garing stabil hingga 6 bulan tanpa apek, higienis terstandarisasi industri.',
    recommendedPackaging: 'Bal 5 kg higienis tersegel & Karton 10 kg (lapisan plastik PE kedap udara food-grade).',
    pricingGuidance: 'Rp 155.000 – Rp 165.000 / kg (Tier 1 & Tier 2)',
    proofPoints: [
      'Free Sample Kit 250–500 gram untuk uji kerenyahan di dapur koki.',
      'Tidak merusak plating, renyah tahan lama di suhu ruang meja prasmanan / nasi box.',
      'Sertifikasi PIRT & Halal Ready.',
    ],
    defaultTemplateId: 'horeca_catering',
  },
  {
    id: 'resto_chain',
    title: 'Jaringan Resto & Franchise Kuliner',
    subtitle: 'Resto Bakso, Soto, Rawon, Mie & Nasi Goreng (Central Kitchen)',
    icon: UtensilsCrossed,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    targetBuyerPersona: 'Owner Franchise, Head of Central Kitchen, Procurement Manager',
    keyPainPoints: [
      'Bawang oplosan tepung murah membuat kuah kaldu bakso/soto keruh berlendir dan asam.',
      'Koki harus menabur porsi 1.4x lebih banyak (14g vs 10g) karena rasa bawang tertutup tepung.',
      'Fluktuasi harga pasar membuat COGS / HPP per porsi resto tidak stabil.',
      'Rantai pasok sering putus saat musim hujan/gagal panen.',
    ],
    valueProposition:
      '100% Bawang Merah Brebes Murni (0% Tepung Tapioka). Aroma gurih pekat asli Brebes—cukup 1 sendok per porsi. Kuah kaldu tetap bening, bersih, dan harum. Suplai terjadwal mingguan dari buffer stock Bogor.',
    recommendedPackaging: 'Bal 5 kg curah central kitchen & karton 10 kg siap distribusikan ke cabang.',
    pricingGuidance: 'Rp 145.000 – Rp 155.000 / kg (Tier 2 & Tier 3)',
    proofPoints: [
      'Hemat takaran hingga 30% per mangkok dibanding bawang bertepung.',
      'Kuah kaldu tetap jernih dan beraroma harum alami.',
      'Jaminan stabilitas pasokan berkala tanpa putus stok ke central kitchen.',
    ],
    defaultTemplateId: 'resto_chain',
  },
  {
    id: 'food_industry',
    title: 'Industri Sambal, Seasoning & Maklon',
    subtitle: 'Pabrik Sambal Kemasan, Bumbu Tabur, Kaldu & Premix Pangan',
    icon: Factory,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    targetBuyerPersona: 'R&D Food Technologist, QC Manager, Procurement Pabrik Pangan',
    keyPainPoints: [
      'Minyak bebas berlebih memicu caking (penggumpalan) pada lini mesin bumbu tabur / premix bubuk.',
      'Irisan bawang tidak seragam menyumbat nozzle dispensing mesin filling botol/sachet.',
      'Spesifikasi kadar air dan kebersihan partikel dari supplier tradisional tidak terstandar.',
    ],
    valueProposition:
      'Varian Bawang Giling Kasar (Coarse Ground / Mesh Bumbu) & Irisan Seragam. Tiris minyak sentrifugal maksimal sehingga anti-caking, kadar air rendah, dan kemasan zak industri siap batching pabrik.',
    recommendedPackaging: 'Zak karung industri 20–25 kg dengan kantong inner PE food-grade kedap udara.',
    pricingGuidance: 'Rp 140.000 – Rp 150.000 / kg (Tier 3 & Tier 4 Kontrak Rutin)',
    proofPoints: [
      'Lolos evaluasi QC pabrik: kadar asam lemak bebas rendah, lolos mesh mixer.',
      'Kapasitas buffer stock 5–10 ton/bulan di gudang Bogor, siap suplai rutin ke Jabodetabek & Bandung.',
      'Dokumen CoA (Certificate of Analysis) & BAST resmi per pengiriman.',
    ],
    defaultTemplateId: 'food_industry',
  },
]

interface ScriptTemplate {
  id: string
  name: string
  segment: SegmentType | 'followup' | 'pricing'
  subject: string
  template: (data: { picName: string; companyName: string; city: string; packType: string }) => string
}

const TEMPLATES: ScriptTemplate[] = [
  {
    id: 'resto_chain',
    name: 'Restoran & Central Kitchen (Contoh: Bakso Boedjangan / CRP Group)',
    segment: 'resto_chain',
    subject: 'Penawaran Pasokan Bawang Goreng Murni Brebes Mutu Resto',
    template: ({ picName, companyName, city, packType }) =>
      `Selamat pagi / siang Bapak/Ibu ${picName || 'Tim Purchasing'} di ${companyName || 'Resto'},\n\n` +
      `Salam hangat, saya Agung Gunawan dari PT Haturan Spice Indonesia (haturan.com), fasilitas pengolahan dan distribusi rempah di Bogor.\n\n` +
      `Kami mengamati operasional ${companyName || 'restoran Bapak/Ibu'} yang terus berkembang di ${city || 'kota Anda'}. Untuk menjaga konsistensi cita rasa menu kuah dan hidangan utama, penggunaan bawang goreng berkualitas sangat menentukan agar kuah tetap bening, harum, dan tidak cepat apek.\n\n` +
      `Keunggulan Bawang Merah Goreng Haturan:\n` +
      `• Murni 100% Brebes Super (0% Campuran Tepung Tapioka).\n` +
      `• Penirisan minyak sentrifugal optimal: kuah tidak keruh berminyak & hemat takaran saji hingga 30% per mangkok.\n` +
      `• Kemasan: ${packType || 'Bal 5 kg higienis sealed (praktis rotasi dapur central kitchen)'}.\n` +
      `• Pasokan stabil terjadwal langsung dari fasilitas Bogor.\n\n` +
      `Kami sangat mengedepankan kesesuaian dapur. Sebagai langkah awal, kami siap mengirimkan FREE SAMPLE (250–500 gram) langsung ke central kitchen ${companyName || 'Bapak/Ibu'} untuk uji rasa dan kuah oleh chef / tim dapur.\n\n` +
      `Apakah diperkenankan kami kirimkan paket sampel uji tersebut minggu ini? Mohon konfirmasi alamat lengkapnya ya. Terima kasih banyak.\n\n` +
      `Salam hormat,\nAgung Gunawan\nPT Haturan Spice Indonesia (haturan.com)\nFasilitas: Bogor, Jawa Barat`,
  },
  {
    id: 'horeca_catering',
    name: 'HORECA & Katering Event (Contoh: Miranty Catering)',
    segment: 'horeca',
    subject: 'Penawaran Pasokan Bawang Merah Goreng Renyah Tahan Lama',
    template: ({ picName, companyName, city, packType }) =>
      `Selamat pagi / siang ${picName || 'Tim Dapur & Pengadaan'} ${companyName || 'Catering'},\n\n` +
      `Salam kenal, saya Agung Gunawan dari PT Haturan Spice Indonesia (haturan.com), penyedia rempah dan bahan pangan terkurasi di Bogor.\n\n` +
      `Dalam melayani katering event dan nasi box, seringkali bawang goreng mudah lembek karena uap makanan di kemasan tertutup. Produk Bawang Merah Goreng kami diproses dengan penirisan minyak sentrifugal optimal dan kadar air rendah, sehingga:\n` +
      `1. Jauh lebih tahan garing & renyah saat dikemas dalam lunch box atau meja prasmanan.\n` +
      `2. Bebas minyak berlebih (tidak mengotori kemasan atau bikin eneg).\n` +
      `3. Kemasan: ${packType || 'Bal higienis 5 kg / karton 10 kg (sangat praktis untuk rotasi stok dapur harian)'}.\n\n` +
      `Kami ingin mengirimkan FREE SAMPLE (250–500 gr) ke dapur ${companyName || 'Bapak/Ibu'} di ${city || 'lokasi Anda'} agar chef/tim dapur bisa mencoba langsung kerenyahannya.\n\n` +
      `Kira-kira paket sampelnya bisa kami kirimkan ke alamat dapur mana ya? Terima kasih atas kesempatannya.\n\n` +
      `Salam hangat,\nAgung Gunawan\nPT Haturan Spice Indonesia (haturan.com)`,
  },
  {
    id: 'food_industry',
    name: 'Pabrik Sambal & Seasoning (Contoh: PT Rajo Food / Golden Seasoning)',
    segment: 'food_industry',
    subject: 'Penawaran Pasokan Bawang Merah Goreng Mutu Industri (Coarse Ground & Slice)',
    template: ({ picName, companyName, city, packType }) =>
      `Selamat pagi / siang ${picName || 'Tim Procurement'} ${companyName || 'Pabrik'},\n\n` +
      `Perkenalkan, saya Agung Gunawan dari PT Haturan Spice Indonesia (haturan.com), fasilitas pengolahan rempah & bahan baku industri pangan di Bogor.\n\n` +
      `Untuk kebutuhan formulasi bumbu tabur, seasoning, atau racikan base sambal di fasilitas ${companyName || 'Bapak/Ibu'} di ${city || 'lokasi Anda'}, kami menyediakan pasokan rutin Bawang Merah Goreng Mutu Industri:\n` +
      `• Varian: Giling Kasar (Coarse Ground) untuk mesh bumbu/sambal & Slice Renyah.\n` +
      `• Kadar minyak bebas sangat rendah (tiris sentrifugal kecepatan tinggi, anti-caking pada premix).\n` +
      `• Kemasan: ${packType || 'Zak karung industri 20–25 kg dengan kantong inner PE food-grade'}.\n` +
      `• Buffer stock stabil dari gudang Bogor, siap suplai rutin Franco terjadwal.\n\n` +
      `Kami siap mengirimkan Sample Kit gratis untuk uji lab dan formulasi R&D pabrik Bapak/Ibu.\n\n` +
      `Apakah berkenan kami kirimkan sampel uji tersebut pekan ini? Mohon arahan alamat dan kontak PIC penerima di ${city || 'lokasi pabrik'}. Terima kasih.\n\n` +
      `Salam hormat,\nAgung Gunawan\nPT Haturan Spice Indonesia (haturan.com)`,
  },
  {
    id: 'streak_followup',
    name: 'Follow-Up Cepat (Jika Email Dibuka di Streak CRM)',
    segment: 'followup',
    subject: 'Follow-Up Penawaran Pasokan Bawang Merah Goreng Haturan',
    template: ({ picName, companyName, city }) =>
      `Selamat pagi / siang Bapak/Ibu ${picName || 'Tim Purchasing'} di ${companyName || 'perusahaan Bapak/Ibu'},\n\n` +
      `Salam kenal, saya Agung Gunawan dari PT Haturan Spice Indonesia (haturan.com).\n\n` +
      `Tadi kami sempat mengirimkan proposal penawaran pasokan Bawang Merah Goreng Mutu Industri via email ke tim pengadaan ${companyName || 'Bapak/Ibu'}.\n\n` +
      `Kami sangat mengutamakan kesesuaian rasa dan spesifikasi dapur Anda sebelum kerja sama resmi dimulai. Kami ingin mengirimkan Free Sample (250–500 gram) langsung ke fasilitas Anda di ${city || 'lokasi Anda'} agar bisa dievaluasi langsung oleh tim koki / QC.\n\n` +
      `Kira-kira paket sampel ujinya bisa kami kirimkan ke alamat mana ya? Terima kasih banyak atas waktunya.\n\n` +
      `Salam hormat,\nAgung Gunawan\nPT Haturan Spice Indonesia (haturan.com)`,
  },
  {
    id: 'price_inquiry',
    name: 'Jawaban Keberatan: "Berapa Harganya?"',
    segment: 'pricing',
    subject: 'Jawaban Transparan Rentang Harga Haturan Spice',
    template: ({ picName, companyName }) =>
      `Selamat pagi / siang Bapak/Ibu ${picName || 'Bapak/Ibu'},\n\n` +
      `Untuk harga Franco langsung ke lokasi dapur/pabrik ${companyName || 'Bapak/Ibu'}, berada di kisaran Rp 144.000 – Rp 165.000 / kg, tergantung pada volume pemesanan berkala dan jenis kemasan (bal 5 kg atau karung 25 kg).\n\n` +
      `Produk kami adalah 100% Brebes Murni tanpa campuran tepung tapioka dengan penirisan sentrifugal ganda, sehingga pemakaiannya jauh lebih hemat dan kuah makanan tidak keruh berlendir.\n\n` +
      `Sebagai langkah awal, kami kirimkan Free Sample dulu agar tim dapur / QC bisa memvalidasi langsung mutunya. Mohon info alamat pengiriman sampelnya ya. Terima kasih!`,
  },
]

const OBJECTION_ITEMS = [
  {
    question: 'Berapa harga per kg-nya?',
    suggestedAnswer:
      'Untuk harga Franco langsung ke dapur Bapak/Ibu, berada di kisaran Rp 144.000 – Rp 165.000 / kg tergantung volume berkala dan jenis kemasan (bal 5kg atau karung 25kg). Jangan khawatir, sebagai langkah awal kami kirimkan sampel uji gratis dulu agar tim koki bisa membuktikan mutu dan kehematan takarannya.',
    strategy:
      'Jangan langsung sebut harga terendah. Jual dari rentang atas. Floor negosiasi absolut: Rp 140.000/kg (Profit aman Rp 10.000/kg).',
  },
  {
    question: 'Bisa bayar tempo / TOP 30 atau 60 hari?',
    suggestedAnswer:
      'Untuk pesanan perdana (trial order 100–200 kg), standar operasional keuangan kami menggunakan sistem Cash Before Delivery (CBD) atau Cash on Delivery (COD) saat barang tiba dan lolos verifikasi QC. Setelah berjalan rutin 2–3 kali transaksi, kami sangat terbuka untuk mengajukan fasilitas tempo pembayaran (TOP 14–30 hari).',
    strategy:
      'DILARANG izinkan tempo untuk pembeli baru. Gunakan dalih audit kelayakan kredit sistem keuangan PT Haturan.',
  },
  {
    question: 'Apakah bawangnya tidak cepat melempem atau apek?',
    suggestedAnswer:
      'Produk kami melalui proses penirisan sentrifugal kecepatan tinggi untuk memastikan kadar minyak bebas sangat minim (< 3%). Kadar air dijaga di bawah 3% dan dikemas dengan inner plastic PE kedap udara. Daya simpan renyah stabil 3–6 bulan di suhu ruang dapur kering.',
    strategy:
      'Tekankan keunggulan mesin spinner peniris sentrifugal ganda Mas Parmin di Bogor.',
  },
  {
    question: 'Bisa kirim berapa ton per bulan?',
    suggestedAnswer:
      'Fasilitas pengolahan dan sortasi kami di Bogor saat ini memiliki kapasitas suplai rutin 5–10 ton per bulan dengan alokasi buffer stock terjadwal. Untuk order rutin katering/resto, pengiriman terjadwal mingguan bisa langsung kami prioritaskan.',
    strategy:
      'Kapasitas realistis jaringan Mas Parmin & kemitraan petani Brebes.',
  },
  {
    question: 'Bisa minta dikunjungi atau meeting langsung?',
    suggestedAnswer:
      'Tentu dengan senang hati. Kami juga sangat mengundang tim purchasing Bapak/Ibu untuk berkunjung langsung ke fasilitas sortasi, pengolahan, dan gudang kami di Bogor untuk melihat proses QC dan kesiapan stok kami secara langsung.',
    strategy:
      'Arahkan kunjungan ke gudang Mas Parmin di Bogor untuk membuktikan transparansi fasilitas fisik.',
  },
]

export function MarketingStrategyHub() {
  const [activeTab, setActiveTab] = useState<'battlecards' | 'roi' | 'scripts'>('battlecards')

  // ROI Calculator State
  const [monthlyVolumeKg, setMonthlyVolumeKg] = useState<number>(200)
  const [adulteratedPriceKg, setAdulteratedPriceKg] = useState<number>(95000)
  const [tapiocaPct, setTapiocaPct] = useState<number>(25)
  const [pureHtrnPriceKg, setPureHtrnPriceKg] = useState<number>(150000)
  const [servingGramsPure, setServingGramsPure] = useState<number>(10)

  // Script Generator State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('resto_chain')
  const [picName, setPicName] = useState<string>('Chef Ronald')
  const [companyName, setCompanyName] = useState<string>('Bakso Boedjangan Group')
  const [city, setCity] = useState<string>('Bandung')
  const [packType, setPackType] = useState<string>('Bal 5 kg higienis sealed (khusus central kitchen)')
  const [isCopied, setIsCopied] = useState<boolean>(false)

  // Format IDR Helper
  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(n)

  // ROI Calculations
  const roiCalculations = useMemo(() => {
    const tapiocaPricePerKg = 12000
    const tapiocaFraction = tapiocaPct / 100
    const pureFraction = 1 - tapiocaFraction
    const tapiocaCostIn1Kg = tapiocaFraction * tapiocaPricePerKg

    const effectiveOnionPriceInAdulterated = Math.round(
      (adulteratedPriceKg - tapiocaCostIn1Kg) / (pureFraction || 1)
    )

    const servingGramsAdulterated = servingGramsPure * 1.4
    const totalCostPure = monthlyVolumeKg * pureHtrnPriceKg
    const servingsFromPure = Math.round((monthlyVolumeKg * 1000) / servingGramsPure)
    const costPerServingPure = Math.round(totalCostPure / servingsFromPure)

    const volumeRequiredAdulterated = Math.round((servingsFromPure * servingGramsAdulterated) / 1000)
    const totalCostAdulterated = volumeRequiredAdulterated * adulteratedPriceKg
    const costPerServingAdulterated = Math.round(totalCostAdulterated / servingsFromPure)

    const costDifferenceTotal = totalCostPure - totalCostAdulterated
    const costDifferencePerServing = costPerServingPure - costPerServingAdulterated

    return {
      effectiveOnionPriceInAdulterated,
      servingsFromPure,
      servingGramsAdulterated,
      volumeRequiredAdulterated,
      totalCostPure,
      totalCostAdulterated,
      costPerServingPure,
      costPerServingAdulterated,
      costDifferenceTotal,
      costDifferencePerServing,
    }
  }, [monthlyVolumeKg, adulteratedPriceKg, tapiocaPct, pureHtrnPriceKg, servingGramsPure])

  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0]
  const generatedScript = useMemo(() => {
    return activeTemplate.template({
      picName,
      companyName,
      city,
      packType,
    })
  }, [activeTemplate, picName, companyName, city, packType])

  function handleCopyScript() {
    navigator.clipboard.writeText(generatedScript)
    setIsCopied(true)
    toast.success('Script WhatsApp berhasil disalin ke clipboard!')
    setTimeout(() => setIsCopied(false), 2500)
  }

  function handleOpenWhatsApp() {
    const encoded = encodeURIComponent(generatedScript)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  function handleSelectBattlecard(card: PersonaBattlecard) {
    setSelectedTemplateId(card.defaultTemplateId)
    setActiveTab('scripts')
  }

  return (
    <div className="space-y-8">
      {/* 1. Header Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab('battlecards')}
          className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'battlecards'
              ? 'border-[#1a472a] text-[#1a472a]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Target className="h-4 w-4" />
          Battlecards Persona Buyer
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roi')}
          className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'roi'
              ? 'border-[#1a472a] text-[#1a472a]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Calculator className="h-4 w-4" />
          Kalkulator ROI Anti-Oplosan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scripts')}
          className={`border-b-2 px-5 py-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'scripts'
              ? 'border-[#1a472a] text-[#1a472a]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          WhatsApp B2B Sales Pitch Generator
        </button>
      </div>

      {/* 2. Top Strategic KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block">
            Target Segmen Utama
          </span>
          <div className="text-xl font-black text-gray-900 mt-1">3 Segmen B2B</div>
          <span className="text-[11px] text-gray-500 mt-0.5 block">HORECA, Resto Chain & Pabrik Sambal</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block">
            Standar Mutu Haturan
          </span>
          <div className="text-xl font-black text-emerald-700 mt-1">100% Brebes Super</div>
          <span className="text-[11px] text-emerald-800 mt-0.5 block">0% Tepung, Minyak Bebas &lt; 3%</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block">
            Benchmark Margin B2B
          </span>
          <div className="text-xl font-black text-gray-900 mt-1">Rp 15.000 – Rp 35.000</div>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Gross margin per kg di atas HPP</span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block">
            Kunci Konversi Sales
          </span>
          <div className="text-xl font-black text-[#1a472a] mt-1">Free Kitchen Sample</div>
          <span className="text-[11px] text-gray-500 mt-0.5 block">Kirim 250–500g untuk uji chef</span>
        </div>
      </div>

      {/* 3. TAB 1: BATTLECARDS */}
      {activeTab === 'battlecards' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-[#1a472a]" />
                Target Buyer Persona Battlecards
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Panduan komprehensif profil decision maker, identifikasi rasa sakit (pain points), proposisi nilai,
                dan rekomendasi penawaran harga per segmen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {BATTLECARDS.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs flex flex-col justify-between hover:border-gray-300 transition-all space-y-5"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-gray-100 text-gray-800">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-base">{card.title}</h3>
                            <span className="text-[11px] text-gray-500 line-clamp-1">{card.subtitle}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-medium text-gray-700 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <strong className="text-gray-900 block mb-0.5">Target Decision Maker:</strong>
                        <span>{card.targetBuyerPersona}</span>
                      </div>
                    </div>

                    {/* Pain Points */}
                    <div>
                      <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Masalah Dapur (Pain Points):
                      </span>
                      <ul className="space-y-1.5 text-xs text-gray-600">
                        {card.keyPainPoints.map((pt, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Value Proposition */}
                    <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-100">
                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block mb-1 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                        Solusi Haturan Spice:
                      </span>
                      <p className="text-xs text-emerald-800 leading-relaxed">{card.valueProposition}</p>
                    </div>

                    {/* Packaging & Pricing */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Format Kemasan:</span>
                        <span className="font-semibold text-gray-800 text-right max-w-[200px]">
                          {card.recommendedPackaging}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-medium">Panduan Harga:</span>
                        <span className="font-bold text-[#1a472a]">{card.pricingGuidance}</span>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectBattlecard(card)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-gray-800 cursor-pointer shadow-2xs transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Buat Penawaran WA Segmen Ini</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. TAB 2: ROI & ANTI-OPLOSAN CALCULATOR */}
      {activeTab === 'roi' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
          <div className="border-b border-gray-100 pb-5">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
              Kalkulator Keekonomian Resto
            </div>
            <h2 className="mt-2 text-xl font-bold text-gray-900">
              Kalkulator ROI & Analisa Biaya Anti-Oplosan (Pure vs Tapioka)
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-3xl">
              Alat bantu sales untuk mematahkan keberatan buyer yang membandingkan harga bawang murni Haturan
              dengan bawang oplosan murah di pasar. Buktikan secara matematis bahwa harga murah berujung pada pemborosan
              takaran dan risiko kuah keruh.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Controls */}
            <div className="lg:col-span-5 space-y-5 bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80">
              <h3 className="font-bold text-sm text-gray-900">Parameter Kebutuhan Dapur Buyer</h3>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700">Estimasi Kebutuhan Bulanan (kg):</label>
                  <span className="text-xs font-bold text-gray-900">{monthlyVolumeKg} kg</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1000}
                  step={25}
                  value={monthlyVolumeKg}
                  onChange={(e) => setMonthlyVolumeKg(Number(e.target.value))}
                  className="w-full accent-[#1a472a] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Harga Bawang Oplosan Pasar (Rp / kg)
                </label>
                <input
                  type="number"
                  value={adulteratedPriceKg}
                  onChange={(e) => setAdulteratedPriceKg(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Harga bawang murah di pasar / supplier lama buyer.
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700">Estimasi Campuran Tepung Tapioka (%):</label>
                  <span className="text-xs font-bold text-amber-700">{tapiocaPct}% Tapioka</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={40}
                  step={5}
                  value={tapiocaPct}
                  onChange={(e) => setTapiocaPct(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Bawang pasar murah umumnya mengandung 20% – 30% tepung tapioka curah.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Harga Penawaran Haturan Murni (Rp / kg)
                </label>
                <input
                  type="number"
                  value={pureHtrnPriceKg}
                  onChange={(e) => setPureHtrnPriceKg(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  Harga jual Haturan (100% Brebes Murni, 0% Tepung).
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700">Standar Porsi Tabur Murni (gram / mangkok):</label>
                  <span className="text-xs font-bold text-gray-900">{servingGramsPure} gram</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={20}
                  step={1}
                  value={servingGramsPure}
                  onChange={(e) => setServingGramsPure(Number(e.target.value))}
                  className="w-full accent-[#1a472a] cursor-pointer"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  10 gram = ~1 sendok makan penuh bawang renyah.
                </span>
              </div>
            </div>

            {/* Output Calculation Cards & Mathematical Comparison */}
            <div className="lg:col-span-7 space-y-5">
              <h3 className="font-bold text-sm text-gray-900">Perbandingan Finansial & Operasional</h3>

              {/* Highlight Card: Harga Bawang Riil Efektif */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span>Fakta Matematika Harga Oplosan:</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      Harga Riil Bawang Efektif di Produk Oplosan:
                    </div>
                    <span className="text-xs text-gray-600">
                      Setelah mengeliminasi nilai tepung tapioka curah (Rp 12.000/kg)
                    </span>
                  </div>
                  <div className="text-xl font-black text-amber-900">
                    {fmt(roiCalculations.effectiveOnionPriceInAdulterated)}/kg
                  </div>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Ketika buyer membayar <strong>{fmt(adulteratedPriceKg)}/kg</strong> untuk bawang bertepung {tapiocaPct}%,
                  sejatinya mereka membayar <strong>{fmt(roiCalculations.effectiveOnionPriceInAdulterated)}/kg</strong> untuk
                  bawang riilnya! Harga murah hanyalah ilusi bobot tepung.
                </p>
              </div>

              {/* Side by side comparison table */}
              <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-200 bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 pl-4 pr-3">Indikator Komparasi</th>
                      <th className="px-3 py-3 text-emerald-800 bg-emerald-50/50">Haturan (Murni 100%)</th>
                      <th className="px-3 py-3 text-amber-800 bg-amber-50/50">Kompetitor Oplosan ({tapiocaPct}%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 pl-4 pr-3 font-medium text-gray-900">Kadar Tepung Tapioka</td>
                      <td className="px-3 py-3 font-bold text-emerald-700 bg-emerald-50/20">0% (Murni)</td>
                      <td className="px-3 py-3 font-bold text-amber-700 bg-amber-50/20">{tapiocaPct}% Tapioka</td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-4 pr-3 font-medium text-gray-900">Takaran Tabur per Mangkok</td>
                      <td className="px-3 py-3 font-semibold text-gray-800 bg-emerald-50/20">{servingGramsPure} gram</td>
                      <td className="px-3 py-3 font-semibold text-gray-800 bg-amber-50/20">
                        {roiCalculations.servingGramsAdulterated} gram (+40% boros)
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-4 pr-3 font-medium text-gray-900">Total Porsi per {monthlyVolumeKg} kg</td>
                      <td className="px-3 py-3 font-bold text-[#1a472a] bg-emerald-50/20">
                        {roiCalculations.servingsFromPure.toLocaleString('id-ID')} mangkok
                      </td>
                      <td className="px-3 py-3 font-semibold text-gray-600 bg-amber-50/20">
                        {Math.round((monthlyVolumeKg * 1000) / roiCalculations.servingGramsAdulterated).toLocaleString(
                          'id-ID'
                        )}{' '}
                        mangkok
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-4 pr-3 font-medium text-gray-900">Biaya Bawang per Mangkok</td>
                      <td className="px-3 py-3 font-bold text-gray-900 bg-emerald-50/20">
                        {fmt(roiCalculations.costPerServingPure)}
                      </td>
                      <td className="px-3 py-3 font-bold text-gray-900 bg-amber-50/20">
                        {fmt(roiCalculations.costPerServingAdulterated)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pl-4 pr-3 font-bold text-gray-900">Dampak pada Kuah Kaldu</td>
                      <td className="px-3 py-3 font-semibold text-emerald-800 bg-emerald-50/20">
                        Tetap jernih, bersih & wangi
                      </td>
                      <td className="px-3 py-3 font-semibold text-red-700 bg-amber-50/20">
                        Keruh berlendir & asam
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* JEV Closing Pitch Recommendation */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5 space-y-2">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-[#1a472a]" />
                  Kesimpulan Closing Sales JEV:
                </span>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Selisih biaya per mangkok hanya <strong>{fmt(Math.abs(roiCalculations.costDifferencePerServing))}</strong>.
                  Untuk mangkok bakso/soto seharga Rp 25.000 – Rp 40.000, selisih {fmt(Math.abs(roiCalculations.costDifferencePerServing))} sama
                  sekali tidak terasa bagi margin resto, tetapi menjaga <strong>reputasi rasa kuah</strong> dan mencegah
                  pelanggan kabur karena kuah berlendir tepung.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: WHATSAPP PITCH GENERATOR & OBJECTION HANDLING */}
      {activeTab === 'scripts' && (
        <div className="space-y-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-6">
            <div className="border-b border-gray-100 pb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                WhatsApp B2B Generator
              </div>
              <h2 className="mt-2 text-xl font-bold text-gray-900">
                Generator Pesan WhatsApp B2B & Template Outreach
              </h2>
              <p className="text-xs text-gray-500 mt-1 max-w-3xl">
                Buat pesan penawaran WhatsApp profesional dalam hitungan detik. Template ini telah disesuaikan
                dengan psikologi buyer B2B pangan—pendek, tanpa basa-basi, langsung menawarkan Free Sample dapur.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Customizer */}
              <div className="lg:col-span-5 space-y-4 bg-gray-50/70 p-5 rounded-2xl border border-gray-200/80">
                <h3 className="font-bold text-sm text-gray-900">Pilih Template & Parameter Prospek</h3>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Skenario Penawaran:</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none"
                  >
                    {TEMPLATES.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nama PIC / Kontak:</label>
                  <input
                    type="text"
                    value={picName}
                    onChange={(e) => setPicName(e.target.value)}
                    placeholder="Contoh: Chef Ronald / Pak Hendra"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Perusahaan / Resto:</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Contoh: Miranty Catering / PT Rajo Food"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kota / Lokasi:</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Bandung / Depok / Jakarta"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Format Kemasan Penawaran:</label>
                  <input
                    type="text"
                    value={packType}
                    onChange={(e) => setPackType(e.target.value)}
                    placeholder="Contoh: Bal 5 kg higienis sealed / Zak 25 kg"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-900 focus:border-[#1a472a] focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Preview & Actions */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                    <span>Pratinjau Pesan WhatsApp</span>
                    <span className="text-[11px] font-normal text-gray-500">
                      ({generatedScript.length} karakter)
                    </span>
                  </h3>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer shadow-2xs transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-gray-500" />
                          <span>Salin Pesan WA</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 cursor-pointer shadow-2xs transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Buka WhatsApp Web</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/20 p-5 font-sans text-xs text-gray-800 whitespace-pre-line leading-relaxed border-dashed shadow-2xs">
                  {generatedScript}
                </div>
              </div>
            </div>
          </div>

          {/* 6. Matriks Penanganan Keberatan (Objection Handling Guide) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#1a472a]" />
                  Matriks Penanganan Keberatan Prospek (Objection Handling Playbook)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Gunakan jawaban teruji di bawah ini ketika prospek menanyakan harga, syarat tempo pembayaran, atau
                  ketahanan renyah.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OBJECTION_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-gray-900 block mb-1">
                      &quot;{item.question}&quot;
                    </span>
                    <p className="text-xs text-gray-700 bg-white p-3 rounded-lg border border-gray-200 italic leading-relaxed">
                      &quot;{item.suggestedAnswer}&quot;
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                    <span className="text-amber-800 font-medium">Strategi: {item.strategy}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.suggestedAnswer)
                        toast.success('Jawaban keberatan disalin!')
                      }}
                      className="inline-flex items-center gap-1 text-[#1a472a] hover:underline font-bold cursor-pointer shrink-0 ml-2"
                    >
                      <Copy className="h-3 w-3" />
                      Salin Jawaban
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
