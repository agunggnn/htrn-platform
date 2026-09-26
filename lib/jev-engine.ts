import type { Buyer, BuyerTier, PipelineStage } from '@/types'
import { getBuyerTier } from './buyers-helper'
import { parseBuyerKyc } from './kyc-helper'

export type JevIntent =
  | 'SAMPLE_REQUEST'
  | 'FAQ_MUTU_CERT'
  | 'PRICE_INQUIRY'
  | 'NEGOTIATION'
  | 'PO_CONFIRMATION'
  | 'PAYMENT_TERMS_INQUIRY'
  | 'HIGH_RISK_SPAM'
  | 'GENERAL'

export type JevActionType =
  | 'reply_immediately'
  | 'require_human_approval'
  | 'reject_below_floor'

export type JevEvaluationResult = {
  intent: JevIntent
  confidence: number
  urgency: number // 0.0 - 1.0
  actionType: JevActionType
  recommendedStage: PipelineStage
  recommendedReply: string
  reasoning: string
  suggestedTier: BuyerTier
  suggestedPrice: number
  floorPriceViolation: boolean
  volumeDetectedKg: number | null
  kycRiskLevel: 'low' | 'medium' | 'high' | 'unknown'
  allowedPaymentTerms: string
  isEligibleForSample: boolean
  metadata?: Record<string, unknown>
}

// B2B Pricing Constants
export const FLOOR_PRICE = 140000 // Batas Bawah Negosiasi (Hard Floor Margin)
export const SUPPLIER_MODAL_HPP = 125000 // HPP Modal Mas Parmin (Bogor)

export const VOLUME_TIER_PRICING: Record<BuyerTier, { volume: string; price: number; margin: number }> = {
  tier_1: { volume: '100 - 499 kg', price: 165000, margin: 40000 },
  tier_2: { volume: '500 - 999 kg', price: 155000, margin: 30000 },
  tier_3: { volume: '1.000 - 2.000 kg', price: 149000, margin: 24000 },
  tier_4: { volume: '> 2.000 kg', price: 144000, margin: 19000 },
}

export const TDS_SPEC_URL = 'https://app.haturan.com/api/pdf/spec-sheet/bawang-goreng'
export const HALAL_DECLARATION_URL = 'https://app.haturan.com/api/pdf/halal-declaration/bawang-goreng'

/**
 * Extracts proposed volume in kg from conversation text
 */
export function extractVolumeInKg(text: string): number | null {
  // Check for ton (e.g. 1 ton, 2.5 ton)
  const tonMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ton|tn)\b/i)
  if (tonMatch) {
    const tonVal = parseFloat(tonMatch[1].replace(',', '.'))
    if (!isNaN(tonVal)) return Math.round(tonVal * 1000)
  }

  // Check for kg / bal / karton
  const kgMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kilogram)\b/i)
  if (kgMatch) {
    const kgVal = parseFloat(kgMatch[1].replace(',', '.'))
    if (!isNaN(kgVal)) return Math.round(kgVal)
  }

  const balMatch = text.match(/(\d+)\s*(?:bal)\b/i)
  if (balMatch) {
    const balVal = parseInt(balMatch[1], 10)
    if (!isNaN(balVal)) return balVal * 5 // 1 bal = 5 kg
  }

  const boxMatch = text.match(/(\d+)\s*(?:box|dus|karton)\b/i)
  if (boxMatch) {
    const boxVal = parseInt(boxMatch[1], 10)
    if (!isNaN(boxVal)) return boxVal * 20 // 1 master box = 20 kg
  }

  return null
}

/**
 * Evaluates buyer's message through the JEV System 1 Decision Engine (< 50ms)
 * Deterministic, non-autoregressive, zero-hallucination guardrail for HTRN CRM.
 */
export function evaluateJev(input: {
  text: string
  buyer?: Buyer | null
  channel?: 'whatsapp' | 'email' | 'web'
}): JevEvaluationResult {
  const { text, buyer, channel = 'whatsapp' } = input
  const clean = (text || '').toLowerCase().trim()
  const picName = buyer?.contact_name || 'Bapak/Ibu'
  const companyName = buyer?.company_name || 'rekan bisnis'
  const tier = buyer ? (buyer.buyer_tier || getBuyerTier(buyer)) : 'tier_2'
  const tierPrice = VOLUME_TIER_PRICING[tier]?.price || 155000

  // 1. Parse KYC Profile
  const kyc = buyer ? parseBuyerKyc(buyer) : null
  const kycRiskLevel = kyc?.riskLevel || 'low'
  const allowedPaymentTerms = kyc?.allowedTerms || 'CBD'
  const isKycVerified = kyc?.isVerified || false

  // 2. Detect Proposed Price Below Floor (Floor Price Tripwire)
  const priceMatches =
    text.match(/(?:rp\.?\s*)?\b(1[0-9]{2}|[7-9][0-9])(?:\.000|\s?ribu|\s?rb|\s?k)\b|\b(?:rp\.?\s*)?(1[0-3][0-9]{4}|[7-9][0-9]{4})\b/gi) || []
  let proposedPriceBelowFloor = false
  let lowestProposedPrice: number | null = null

  for (const match of priceMatches) {
    const rawDigits = parseInt(match.replace(/\D/g, ''), 10)
    const normalizedPrice = rawDigits < 1000 ? rawDigits * 1000 : rawDigits
    if (normalizedPrice > 50000 && normalizedPrice < FLOOR_PRICE) {
      proposedPriceBelowFloor = true
      if (lowestProposedPrice === null || normalizedPrice < lowestProposedPrice) {
        lowestProposedPrice = normalizedPrice
      }
    }
  }

  // 3. Extract Volume
  const volumeKg = extractVolumeInKg(clean)

  // 4. Urgency Score Calculation
  let urgency = 0.5
  if (/segera|urgent|asap|hari ini|besok|butuh cepat|stok habis|ready sekarang/i.test(clean)) urgency += 0.4
  if (/minggu depan|bulan depan|nanti|rencana|tanya dulu/i.test(clean)) urgency -= 0.2
  urgency = Math.min(1.0, Math.max(0.1, urgency))

  // 5. Detect High Risk / Spam
  if (kycRiskLevel === 'high' || (kyc?.spamCount || 0) > 3) {
    return {
      intent: 'HIGH_RISK_SPAM',
      confidence: 0.99,
      urgency: 0.1,
      actionType: 'require_human_approval',
      recommendedStage: 'lead',
      reasoning: 'Nomor atau profil terdeteksi memiliki risiko tinggi / indikasi spam pada Getcontact. Membatasi transaksi ke pembayaran tunai di muka (CBD) dengan verifikasi ketat.',
      recommendedReply: channel === 'whatsapp'
        ? `Halo ${picName} (${companyName}), terima kasih telah menghubungi PT Haturan Spice Indonesia.\n\n` +
          `Untuk penanganan pesanan dan penerbitan penawaran resmi, seluruh transaksi pelanggan baru mengikuti prosedur kepatuhan *Cash Before Delivery (CBD)*. Tim kami akan segera meninjau kebutuhan Anda.`
        : `Yth. ${picName} (${companyName}),\n\nTerima kasih atas pesan Anda. Seluruh pemesanan perdana diproses dengan ketentuan CBD. Tim pengadaan kami akan menghubungi Anda kembali.`,
      suggestedTier: tier,
      suggestedPrice: tierPrice,
      floorPriceViolation: false,
      volumeDetectedKg: volumeKg,
      kycRiskLevel,
      allowedPaymentTerms: 'CBD',
      isEligibleForSample: false,
    }
  }

  // 6. Detect Payment Terms / Tempo / Kredit Inquiry
  if (/tempo|termin|kredit|net\s?7|net\s?14|net\s?30|bayar mundur|mundur|invoice pending|hutang/i.test(clean)) {
    const termsReason = !isKycVerified
      ? 'Buyer menanyakan termin pembayaran/tempo, namun status KYC belum terverifikasi resmi. JEV mengunci syarat CBD/DP 50%.'
      : `Buyer menanyakan termin pembayaran. Status KYC terverifikasi dengan ketentuan: ${allowedPaymentTerms}.`

    const termsReply = channel === 'whatsapp'
      ? `Halo ${picName} (${companyName}), mengenai termin pembayaran:\n\n` +
        (!isKycVerified
          ? `Sesuai standar kepatuhan pengadaan PT Haturan Spice Indonesia, untuk kemitraan awal transaksi diproses dengan skema *Cash Before Delivery (CBD)* atau *DP 50% saat PO dan pelunasan saat barang siap kirim*.\n\n` +
            `Fasilitas termin pembayaran (Net 7 / Net 14) dapat diaktifkan setelah melalui proses verifikasi legalitas *B2B KYC (NIB & NPWP)* serta riwayat 3 kali transaksi perdana.`
          : `Akun kemitraan ${companyName} telah terverifikasi dengan fasilitas termin: *${allowedPaymentTerms}* (Plafon Kredit: Rp ${(kyc?.creditLimit || 0).toLocaleString('id-ID')}).`)
      : `Yth. ${picName},\n\nMengenai termin pembayaran, untuk transaksi awal diberlakukan skema CBD atau DP 50%. Fasilitas kredit dibuka setelah verifikasi B2B KYC.`

    return {
      intent: 'PAYMENT_TERMS_INQUIRY',
      confidence: 0.95,
      urgency,
      actionType: isKycVerified ? 'reply_immediately' : 'require_human_approval',
      recommendedStage: 'negotiation',
      reasoning: termsReason,
      recommendedReply: termsReply,
      suggestedTier: tier,
      suggestedPrice: tierPrice,
      floorPriceViolation: false,
      volumeDetectedKg: volumeKg,
      kycRiskLevel,
      allowedPaymentTerms,
      isEligibleForSample: true,
    }
  }

  // 7. Check Sample Request
  if (/sampel|sample|tester|tes rasa|coba dulu|kirim 250|contoh produk/i.test(clean)) {
    return {
      intent: 'SAMPLE_REQUEST',
      confidence: 0.96,
      urgency: Math.max(urgency, 0.7),
      actionType: 'reply_immediately',
      recommendedStage: 'sample_sent',
      reasoning: 'Buyer meminta sampel tester dapur. Menyediakan sample pack gratis 250g Brebes Super Murni Tanpa Tepung untuk kitchen trial.',
      recommendedReply: channel === 'whatsapp'
        ? `Halo ${picName} (${companyName}), salam hangat dari PT Haturan Spice Indonesia.\n\n` +
          `Tentu, kami dengan senang hati mengirimkan *Tester Kitchen Trial (Sampel 250g Grade Brebes Super Murni Tanpa Tepung)* bebas biaya sampel ke dapur katering/resto ${companyName}.\n\n` +
          `Mohon informasikan alamat pengiriman dapur dan nama PIC penerima di lokasi agar dapat kami jadwalkan pengirimannya hari ini.\n\n` +
          `Dokumen spesifikasi mutu resmi dapat diakses di: ${TDS_SPEC_URL}`
        : `Yth. ${picName} (${companyName}),\n\nKami siap mengirimkan sampel 250g Bawang Merah Goreng Brebes Super Murni Bebas Biaya Sampel. Mohon konfirmasi alamat lengkap dapur dan nama penerima. Dokumen spesifikasi teknis: ${TDS_SPEC_URL}`,
      suggestedTier: tier,
      suggestedPrice: tierPrice,
      floorPriceViolation: false,
      volumeDetectedKg: volumeKg,
      kycRiskLevel,
      allowedPaymentTerms,
      isEligibleForSample: true,
    }
  }

  // 8. Check Certification / Halal / TDS / Mutu FAQ
  if (/halal|spek|tds|tepung|murni|coa|komposisi|minyak|kadaluarsa|expired|izin|bpom/i.test(clean)) {
    return {
      intent: 'FAQ_MUTU_CERT',
      confidence: 0.98,
      urgency,
      actionType: 'reply_immediately',
      recommendedStage: 'target_outreach',
      reasoning: 'Buyer menanyakan jaminan mutu, sertifikasi halal, atau spesifikasi teknis (TDS). Memberikan fakta akurat tanpa overclaim.',
      recommendedReply: channel === 'whatsapp'
        ? `Halo ${picName} (${companyName}), terima kasih atas pertanyaannya.\n\n` +
          `Seluruh produk *Bawang Merah Goreng Haturan* diolah dari 100% varietas Brebes asli grade super:\n` +
          `• *100% Murni Tanpa Tepung* (Kadar tepung 0%, tidak berminyak/tiris sentrifugal).\n` +
          `• *Jaminan Halal*: Diproses di fasilitas mitra bersertifikat Halal, 100% minyak kelapa sawit nabati terverifikasi.\n` +
          `• *Rasio Efisiensi Dapur*: Daya apung tinggi (hanya butuh 3g per mangkok vs 6g bawang bertepung), menghemat hingga 40% pemakaian bulanan.\n\n` +
          `Dokumen resmi dapat diunduh langsung:\n` +
          `📄 *TDS Spek Mutu*: ${TDS_SPEC_URL}\n` +
          `🛡️ *Surat Pernyataan Halal*: ${HALAL_DECLARATION_URL}\n` +
          `Catatan: untuk izin edar BPOM produk, kami akan menyampaikan status terkininya secara tertulis.`
        : `Yth. ${picName} (${companyName}),\n\nProduk kami 100% Brebes Super Murni tanpa campuran tepung, diproses higienis dengan jaminan Halal. Silakan unduh TDS Teknis: ${TDS_SPEC_URL} dan Surat Jaminan Halal: ${HALAL_DECLARATION_URL}. Untuk izin edar BPOM produk, kami akan menyampaikan status terkininya secara tertulis.`,
      suggestedTier: tier,
      suggestedPrice: tierPrice,
      floorPriceViolation: false,
      volumeDetectedKg: volumeKg,
      kycRiskLevel,
      allowedPaymentTerms,
      isEligibleForSample: true,
    }
  }

  // 9. Check Floor Price Violation (Hard Tripwire)
  if (proposedPriceBelowFloor) {
    return {
      intent: 'NEGOTIATION',
      confidence: 0.94,
      urgency,
      actionType: 'reject_below_floor',
      recommendedStage: 'negotiation',
      reasoning: `Buyer mengajukan penawaran harga (Rp ${lowestProposedPrice?.toLocaleString('id-ID')}/kg) yang berada di bawah Batas Bawah Negosiasi (Floor Price Rp 140.000/kg). Menolak secara profesional dengan edukasi mutu murni tanpa tepung.`,
      recommendedReply: channel === 'whatsapp'
        ? `Halo ${picName} (${companyName}), terima kasih atas penawarannya.\n\n` +
          `Mohon maaf, untuk mutu *Grade Brebes Super Murni 100% Tanpa Tepung*, kami belum dapat mengakomodir di bawah Rp 140.000/kg karena harga bahan mentah Brebes saat ini membutuhkan rasio susut 3.8x dan minyak nabati tersertifikasi Halal.\n\n` +
          `Bawang goreng murah di pasaran umumnya menggunakan baluran tepung 15–20% yang cepat tenggelam dan lebih boros per mangkok. Produk murni Haturan jauh lebih hemat secara *Cost-Per-Serving*.\n\n` +
          `Penawaran terbaik kami untuk volume Anda adalah *Rp ${tierPrice.toLocaleString('id-ID')}/kg Franco Jabodetabek*. Apakah berkenan kami kirimkan sampel 250g untuk uji coba perbandingan di dapur?`
        : `Yth. ${picName},\n\nTerima kasih atas penawarannya. Mengingat standar mutu kami adalah 100% murni tanpa tepung dengan rasio susut 3.8x, kami belum dapat memenuhi penawaran di bawah Rp 140.000/kg. Penawaran resmi kami berada di Rp ${tierPrice.toLocaleString('id-ID')}/kg Franco Jabodetabek.`,
      suggestedTier: tier,
      suggestedPrice: tierPrice,
      floorPriceViolation: true,
      volumeDetectedKg: volumeKg,
      kycRiskLevel,
      allowedPaymentTerms,
      isEligibleForSample: true,
    }
  }

  // 10. Check PO / Order Commitment or Large Volume (> 500 kg)
  if (
    /purchase order|po |order |pesan |kirim berapa hari|deal |kontrak|spk/i.test(clean) ||
    (volumeKg !== null && volumeKg >= 500)
  ) {
    const isLarge = volumeKg !== null && volumeKg >= 500
    return {
      intent: 'PO_CONFIRMATION',
      confidence: 0.93,
      urgency: Math.max(urgency, 0.8),
      actionType: 'require_human_approval',
      recommendedStage: isLarge ? 'negotiation' : 'active_customer',
      reasoning: isLarge
        ? `Buyer memesan volume besar (${volumeKg} kg). Memerlukan koordinasi kapasitas jadwal produksi Mas Parmin dan approval Direktur.`
        : 'Buyer menunjukkan komitmen pemesanan atau PO. Memerlukan approval jadwal kirim dan verifikasi tagihan.',
      recommendedReply: channel === 'whatsapp'
        ? `Terima kasih banyak atas kepercayaannya ${picName} (${companyName}).\n\n` +
          `Pesanan pemesanan ${volumeKg ? `volume ${volumeKg} kg ` : ''}telah kami terima. Tim kami sedang mengoordinasikan jadwal batch produksi segar dan armada pengiriman logistik ke lokasi dapur ${companyName}.\n\n` +
          `Surat Penawaran Harga (SPH) resmi dan konfirmasi jadwal kirim akan segera disampaikan oleh Direktur kami (Pak Agung) dalam waktu singkat.`
        : `Yth. ${picName} (${companyName}),\n\nPesanan Anda telah kami catat. Kami sedang menyiapkan jadwal pengiriman dan draf Surat Konfirmasi Pesanan resmi.`,
      suggestedTier: volumeKg && volumeKg >= 2000 ? 'tier_4' : volumeKg && volumeKg >= 1000 ? 'tier_3' : 'tier_2',
      suggestedPrice: volumeKg && volumeKg >= 2000 ? 144000 : volumeKg && volumeKg >= 1000 ? 149000 : 155000,
      floorPriceViolation: false,
      volumeDetectedKg: volumeKg,
      kycRiskLevel,
      allowedPaymentTerms,
      isEligibleForSample: true,
    }
  }

  // 11. Check Price Inquiry / Pricelist / SPH
  if (/harga|pricelist|penawaran|quotation|sph|katalog|biaya per kg|berapaan|ongkir/i.test(clean)) {
    return {
      intent: 'PRICE_INQUIRY',
      confidence: 0.95,
      urgency,
      actionType: 'reply_immediately',
      recommendedStage: 'quotation_sent',
      reasoning: 'Buyer menanyakan struktur harga bawang goreng. Mengirimkan Matriks Harga Tier Volume resmi Haturan.',
      recommendedReply: channel === 'whatsapp'
        ? `Halo ${picName} (${companyName}), berikut adalah *Matriks Harga Tier Volume* Bawang Merah Goreng Brebes Super Murni PT Haturan Spice Indonesia:\n\n` +
          `📦 *Tier 1 (100 – 499 kg)*: Rp 165.000 / kg\n` +
          `📦 *Tier 2 (500 – 999 kg)*: Rp 155.000 / kg\n` +
          `📦 *Tier 3 (1.000 – 2.000 kg)*: Rp 149.000 / kg\n` +
          `📦 *Tier 4 (> 2.000 kg)*: Rp 144.000 / kg (Kontrak Industri)\n\n` +
          `• *Kemasan*: Bal inner PE ganda 5 kg & Master carton box 20 kg (aman tumpuk & kedap udara).\n` +
          `• *Franco Jabodetabek*: Bebas ongkir pengiriman ke dapur/gudang utama.\n` +
          `• *Batas Bawah Negosiasi Terkunci*: Kami menjamin stabilitas pasokan rutin.\n\n` +
          `Berapa estimasi kebutuhan dapur ${companyName} per bulan agar kami dapat siapkan Surat Penawaran Harga (SPH) resmi?`
        : `Yth. ${picName} (${companyName}),\n\nBerikut struktur harga resmi kami:\n- 100 - 499 kg: Rp 165.000/kg\n- 500 - 999 kg: Rp 155.000/kg\n- 1.000 - 2.000 kg: Rp 149.000/kg\n- > 2.000 kg: Rp 144.000/kg\n\nSemua harga Franco Jabodetabek dengan kualitas 100% Brebes super murni.`,
      suggestedTier: tier,
      suggestedPrice: tierPrice,
      floorPriceViolation: false,
      volumeDetectedKg: volumeKg,
      kycRiskLevel,
      allowedPaymentTerms,
      isEligibleForSample: true,
    }
  }

  // 12. General Greeting / Fallback
  return {
    intent: 'GENERAL',
    confidence: 0.85,
    urgency,
    actionType: 'reply_immediately',
    recommendedStage: 'target_outreach',
    reasoning: 'Sapaan umum atau pesan pembuka dari calon pembeli.',
    recommendedReply: channel === 'whatsapp'
      ? `Halo ${picName} (${companyName}), salam hangat dari PT Haturan Spice Indonesia.\n\n` +
        `Kami adalah produsen & pemasok *Bawang Merah Goreng Brebes Super Murni 100% Tanpa Tepung* untuk jaringan katering, restoran, dan industri makanan.\n\n` +
        `Ada yang bisa kami bantu terkait kebutuhan pasokan bawang goreng untuk dapur ${companyName}? Kami siap mengirimkan sampel tester 250g atau rincian spesifikasi mutu (TDS).`
      : `Yth. ${picName} (${companyName}),\n\nTerima kasih telah menghubungi PT Haturan Spice Indonesia. Kami siap melayani kebutuhan pasokan Bawang Merah Goreng Brebes Super Murni untuk bisnis Anda.`,
    suggestedTier: tier,
    suggestedPrice: tierPrice,
    floorPriceViolation: false,
    volumeDetectedKg: volumeKg,
    kycRiskLevel,
    allowedPaymentTerms,
    isEligibleForSample: true,
  }
}
