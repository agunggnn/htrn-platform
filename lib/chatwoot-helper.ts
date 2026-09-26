import type { Buyer, BuyerTier } from '@/types'
import {
  evaluateJev,
  type JevEvaluationResult,
  type JevIntent,
  FLOOR_PRICE,
  VOLUME_TIER_PRICING,
} from './jev-engine'

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

export { evaluateJev, FLOOR_PRICE, VOLUME_TIER_PRICING }
export type { JevEvaluationResult, JevIntent }

/**
 * Evaluates buyer's incoming WhatsApp message through the unified JEV System 1 Decision Engine.
 * Respects strict B2B floor price guardrail (Rp 140.000/kg) and KYC terms gating.
 */
export function evaluateBuyerWhatsAppIntent(
  messageText: string,
  buyer?: Buyer | null
): AgentEvaluationResult {
  const jev = evaluateJev({ text: messageText, buyer, channel: 'whatsapp' })

  // Map JEV intent to legacy intent enum for backward compatibility
  let legacyIntent: BuyerIntent = 'other'
  if (jev.intent === 'SAMPLE_REQUEST') legacyIntent = 'sample_request'
  else if (jev.intent === 'FAQ_MUTU_CERT') legacyIntent = 'faq_mutu_cert'
  else if (jev.intent === 'PRICE_INQUIRY') legacyIntent = 'price_inquiry'
  else if (jev.intent === 'PO_CONFIRMATION') legacyIntent = 'order_po'
  else if (jev.intent === 'GENERAL') legacyIntent = 'greeting'

  return {
    intent: legacyIntent,
    confidence: jev.confidence,
    recommendedReply: jev.recommendedReply,
    reasoning: jev.reasoning,
    suggestedTier: jev.suggestedTier,
    suggestedPrice: jev.suggestedPrice,
    actionType: jev.actionType === 'reject_below_floor' ? 'reply_immediately' : jev.actionType,
    metadata: {
      jevIntent: jev.intent,
      floorPriceViolation: jev.floorPriceViolation,
      volumeDetectedKg: jev.volumeDetectedKg,
      kycRiskLevel: jev.kycRiskLevel,
      allowedPaymentTerms: jev.allowedPaymentTerms,
      urgency: jev.urgency,
    },
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
