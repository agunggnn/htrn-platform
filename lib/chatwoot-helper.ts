import type { Buyer, BuyerTier } from '@/types'
import { getBuyerTier, getBuyerScore } from '@/lib/buyers-helper'

export type BuyerIntent =
  | 'faq_mutu_cert'
  | 'price_inquiry'
  | 'sample_request'
  | 'order_po'
  | 'greeting'
  | 'other'

export type AgentEvaluationResult = {
  intent: BuyerIntent
  confidence: number
  recommendedReply: string
  reasoning: string
  suggestedTier?: BuyerTier
  suggestedPrice?: number
  actionType: 'reply_immediately' | 'require_human_approval' | 'create_quotation'
  metadata?: Record<string, unknown>
}

/**
 * Evaluates buyer's incoming WhatsApp message and constructs autonomous response
 * respecting strict B2B floor price guardrail (Rp 140.000/kg).
 */
export function evaluateBuyerWhatsAppIntent(
  messageText: string,
  buyer?: Buyer | null
): AgentEvaluationResult {
  const clean = (messageText || '').toLowerCase().trim()
  const picName = buyer?.contact_name || 'Bapak/Ibu'
  const companyName = buyer?.company_name || 'rekan bisnis'
  const tier = buyer ? (buyer.buyer_tier || getBuyerTier(buyer)) : 'tier_2'
  const score = buyer ? getBuyerScore(buyer) : 60

  // 1. Check for Sample Request
  if (
    clean.includes('sampel') ||
    clean.includes('sample') ||
    clean.includes('tester') ||
    clean.includes('tes rasa') ||
    clean.includes('coba dulu')
  ) {
    return {
      intent: 'sample_request',
      confidence: 0.95,
      actionType: 'reply_immediately',
      reasoning: 'Buyer meminta sampel tester dapur. Menyediakan sample pack gratis 250g untuk kitchen trial.',
      recommendedReply: `Halo ${picName} (${companyName}), salam hangat dari PT Haturan Spice Indonesia.\n\n` +
        `Tentu, kami dengan senang hati mengirimkan *Tester Kitchen Trial (Sampel 250g Grade Brebes Super Murni Tanpa Tepung)* bebas biaya sampel ke dapur katering/resto ${companyName}.\n\n` +
        `Mohon informasikan alamat pengiriman dapur dan nama penerima di lokasi agar dapat kami jadwalkan pengirimannya hari ini.\n\n` +
        `Dokumen spesifikasi mutu resmi dapat diakses di: https://app.haturan.com/api/pdf/spec-sheet/bawang-goreng`,
    }
  }

  // 2. Check for Certification & Quality / Halal / TDS FAQ
  if (
    clean.includes('halal') ||
    clean.includes('spek') ||
    clean.includes('tds') ||
    clean.includes('tepung') ||
    clean.includes('murni') ||
    clean.includes('coa') ||
    clean.includes('komposisi') ||
    clean.includes('minyak') ||
    clean.includes('kadaluarsa') ||
    clean.includes('expired')
  ) {
    return {
      intent: 'faq_mutu_cert',
      confidence: 0.98,
      actionType: 'reply_immediately',
      reasoning: 'Buyer menanyakan jaminan mutu, sertifikasi halal, atau spesifikasi teknis (TDS).',
      recommendedReply: `Halo ${picName} (${companyName}), terima kasih atas pertanyaannya.\n\n` +
        `Seluruh produk *Bawang Merah Goreng Haturan* diolah dari 100% varietas Brebes asli grade super:\n` +
        `• *100% Murni Tanpa Tepung* (Kadar tepung 0%, tidak berminyak/tiris sentrifugal).\n` +
        `• *Jaminan Halal*: Diproses di fasilitas mitra bersertifikat Halal & BPOM, 100% minyak kelapa sawit nabati terverifikasi.\n` +
        `• *Rasio Efisiensi Dapur*: Daya apung tinggi (hanya butuh 3g per mangkok vs 6g bawang bertepung), menghemat hingga 40% pemakaian bulanan.\n\n` +
        `Dokumen resmi dapat diunduh langsung:\n` +
        `📄 *TDS Spek Mutu*: https://app.haturan.com/api/pdf/spec-sheet/bawang-goreng\n` +
        `🛡️ *Surat Pernyataan Halal*: https://app.haturan.com/api/pdf/halal-declaration/bawang-goreng`,
    }
  }

  // 3. Check for PO / Order Commitment
  if (
    clean.includes('purchase order') ||
    clean.includes('po ') ||
    clean.includes('order ') ||
    clean.includes('pesan ') ||
    clean.includes('kirim berapa hari') ||
    clean.includes('deal ')
  ) {
    return {
      intent: 'order_po',
      confidence: 0.92,
      actionType: 'require_human_approval',
      reasoning: 'Buyer menunjukkan komitmen pemesanan atau PO. Membutuhkan verifikasi jadwal kirim Mas Parmin dan persetujuan Direksi.',
      recommendedReply: `Terima kasih banyak atas kepercayaannya ${picName} (${companyName}).\n\n` +
        `Pemesanan Anda sedang diverifikasi oleh Tim Pengadaan Haturan untuk penjadwalan armada logistik (Lead time produksi & pengiriman H+3 hari kerja).\n\n` +
        `Direktur kami (Pak Agung Gunawan) akan segera mengonfirmasi ketersediaan slot batch dan mengirimkan Surat Jalan & Faktur resmi ke kontak ini. Mohon ditunggu sebentar ya Pak/Ibu. 🙏`,
    }
  }

  // 4. Check for Pricing Inquiry / Negotiation
  if (
    clean.includes('harga') ||
    clean.includes('price') ||
    clean.includes('biaya') ||
    clean.includes('berapa') ||
    clean.includes('kg') ||
    clean.includes('ton') ||
    clean.includes('per kilo') ||
    clean.includes('diskon')
  ) {
    // Extract quantity if mentioned (e.g. "300 kg", "500kg")
    const qtyMatch = clean.match(/(\d+)\s*(?:kg|kilo|ton)/i)
    let requestedKg = 100
    if (qtyMatch) {
      requestedKg = parseInt(qtyMatch[1], 10)
      if (clean.includes('ton')) requestedKg *= 1000
    }

    // Determine pricing tier
    let unitPrice = 165000
    let assignedTier: BuyerTier = 'tier_1'
    if (requestedKg >= 1000) {
      unitPrice = 144000
      assignedTier = 'tier_4'
    } else if (requestedKg >= 500) {
      unitPrice = 149000
      assignedTier = 'tier_3'
    } else if (requestedKg >= 100) {
      unitPrice = 155000
      assignedTier = 'tier_2'
    }

    // STRICT GUARDRAIL: Never sell below floor price Rp 140.000/kg
    const FLOOR_PRICE = 140000
    if (unitPrice < FLOOR_PRICE) {
      unitPrice = FLOOR_PRICE
    }

    return {
      intent: 'price_inquiry',
      confidence: 0.94,
      suggestedTier: assignedTier,
      suggestedPrice: unitPrice,
      actionType: requestedKg >= 500 ? 'require_human_approval' : 'reply_immediately',
      reasoning: `Buyer menanyakan harga untuk estimasi volume ${requestedKg} kg. Menerapkan matriks harga ${assignedTier} (Rp ${unitPrice.toLocaleString('id-ID')}/kg Franco Jabodetabek).`,
      recommendedReply: `Halo ${picName} (${companyName}), berikut penawaran harga resmi Bawang Merah Goreng Brebes Super Murni Haturan:\n\n` +
        `📊 *Matriks Harga Volume (Franco Jabodetabek)*:\n` +
        `• Volume 50–99 kg: *Rp 165.000/kg*\n` +
        `• Volume 100–499 kg: *Rp 155.000/kg*\n` +
        `• Volume 500–999 kg: *Rp 149.000/kg*\n` +
        `• Kontrak Pabrik (≥ 1 Ton): *Rp 144.000/kg*\n\n` +
        `Kemasan: Bal ganda food-grade @ 5 kg dalam Master Box Karton 20 kg.\n` +
        `Termin: Cash Before Delivery (CBD) / DP 50% saat PO terkonfirmasi.\n\n` +
        `Apakah ${companyName} berkenan kami kirimkan Surat Penawaran Harga (SPH) resmi atau ingin kami kirimkan tester sampel 250g terlebih dahulu?`,
      metadata: { requestedKg, unitPrice, tier: assignedTier },
    }
  }

  // 5. Greeting / General Inquiries
  return {
    intent: clean.includes('halo') || clean.includes('pagi') || clean.includes('siang') || clean.includes('sore') || clean.includes('assalamu') ? 'greeting' : 'other',
    confidence: 0.85,
    actionType: 'reply_immediately',
    reasoning: 'Pesan salam pembuka atau pertanyaan umum. Menyambut buyer dengan salam hangat PT Haturan Spice Indonesia.',
    recommendedReply: `Halo ${picName} (${companyName}), selamat datang di layanan pengadaan B2B PT Haturan Spice Indonesia.\n\n` +
      `Ada yang dapat kami bantu terkait kebutuhan Bawang Merah Goreng Brebes Super Murni atau rempah olahan lainnya untuk dapur/industri ${companyName}?`,
  }
}

/**
 * Sends a message to Chatwoot Conversation via Chatwoot REST API
 */
export async function sendChatwootMessage(
  conversationId: number,
  content: string,
  messageType: 'outgoing' | 'private_note' = 'outgoing'
) {
  const baseUrl = (process.env.CHATWOOT_BASE_URL || 'https://app.chatwoot.com').replace(/\/+$/, '')
  const accountId = process.env.CHATWOOT_ACCOUNT_ID
  const apiKey = process.env.CHATWOOT_API_KEY

  if (!accountId || !apiKey) {
    console.warn('[Chatwoot Helper] CHATWOOT_ACCOUNT_ID atau CHATWOOT_API_KEY belum dikonfigurasi di .env.local')
    return { success: false, error: 'Chatwoot credentials not configured' }
  }

  try {
    const url = `${baseUrl}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        api_access_token: apiKey,
      },
      body: JSON.stringify({
        content,
        message_type: messageType === 'private_note' ? 'activity' : 'outgoing',
        private: messageType === 'private_note',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Chatwoot API error (${res.status}): ${errText}`)
    }

    const data = await res.json()
    return { success: true, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown Chatwoot error'
    console.error('[Chatwoot Helper] Gagal mengirim pesan ke Chatwoot:', msg)
    return { success: false, error: msg }
  }
}
