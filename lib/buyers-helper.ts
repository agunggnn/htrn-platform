import type { Buyer, BuyerTier, PipelineStage } from '@/types'

export function encodeBuyerNotes(
  notes?: string | null,
  stage?: string | null,
  tier?: string | null,
  score?: number | null
): string {
  const cleanNotes = (notes || '')
    .replace(/\[Stage:\s*[^\]]+\]/gi, '')
    .replace(/\[Tier:\s*[^\]]+\]/gi, '')
    .replace(/\[Fit:\s*[^\]]+\]/gi, '')
    .trim()

  const tags = []
  if (stage) tags.push(`[Stage: ${stage}]`)
  if (tier) tags.push(`[Tier: ${tier}]`)
  if (score) tags.push(`[Fit: ${score}%]`)

  return tags.length > 0 ? `${tags.join(' ')} ${cleanNotes}`.trim() : cleanNotes
}

export function getBuyerStage(b: Buyer): PipelineStage {
  if (b.pipeline_stage) return b.pipeline_stage
  if (b.notes) {
    const match = b.notes.match(/\[Stage:\s*([a-z_]+)\]/i)
    if (match) return match[1].toLowerCase() as PipelineStage
  }
  const name = b.company_name || ''
  if (name.includes('Gacoan') || name.includes('Belfoods')) return 'active_customer'
  if (
    name.includes('Boga Mitra') ||
    name.includes('Kreasi Rasa') ||
    name.includes('KRAIS') ||
    name.includes('Restu Mande') ||
    name.includes('Boedjangan') ||
    name.includes('Joze Food') ||
    name.includes('Paradise Seera') ||
    name.includes('Karawang Foods') ||
    name.includes('AIMFOOD') ||
    name.includes('Masuya') ||
    name.includes('Indo Pangan')
  ) {
    return 'target_outreach'
  }
  return 'lead'
}

export function getBuyerTier(b: Buyer): BuyerTier {
  if (b.buyer_tier) return b.buyer_tier
  if (b.notes) {
    const match = b.notes.match(/\[Tier:\s*([a-z0-9_]+)\]/i)
    if (match) return match[1].toLowerCase() as BuyerTier
  }
  const name = b.company_name || ''
  if (name.includes('Gacoan') || name.includes('Belfoods')) return 'tier_4'
  if (name.includes('Boedjangan')) return 'tier_3'
  if (
    name.includes('Boga Mitra') ||
    name.includes('Kreasi Rasa') ||
    name.includes('KRAIS') ||
    name.includes('Karawang') ||
    name.includes('AIMFOOD') ||
    name.includes('Masuya') ||
    name.includes('Indo Pangan') ||
    name.includes('Paradise')
  ) {
    return 'tier_2'
  }
  return 'tier_1'
}

export function getBuyerScore(b: Buyer): number {
  if (b.gacoan_similarity_score !== undefined && b.gacoan_similarity_score !== null) {
    return b.gacoan_similarity_score
  }
  if (b.notes) {
    const match = b.notes.match(/\[Fit:\s*(\d+)%?\]/i)
    if (match) return parseInt(match[1], 10)
  }
  const name = b.company_name || ''
  if (name.includes('Gacoan')) return 100
  if (name.includes('Belfoods')) return 70
  if (name.includes('Boga Mitra')) return 60
  if (
    name.includes('Kreasi Rasa') ||
    name.includes('KRAIS') ||
    name.includes('Restu Mande') ||
    name.includes('Boedjangan') ||
    name.includes('Karawang') ||
    name.includes('AIMFOOD') ||
    name.includes('Golden Seasoning')
  ) {
    return 55
  }
  if (name.includes('Rajo Food') || name.includes('Bersama Olah')) return 50
  return 45
}

export function detectProductLine(notes?: string | null): string {
  if (!notes) return '🧅 Bawang Merah Goreng'
  const lower = notes.toLowerCase()
  if (lower.includes('lada')) return '🧂 Lada Bubuk'
  if (lower.includes('bawang putih')) return '🧄 Bawang Putih Kupas'
  if (lower.includes('kunyit') || lower.includes('jahe') || lower.includes('rempah') || lower.includes('ketumbar')) {
    return '🌿 Rempah Bubuk'
  }
  return '🧅 Bawang Merah Goreng'
}

export type WhatsAppStatus = 'uncontacted' | 'sent' | 'replied' | 'sample_requested' | 'rejected'

export type PhoneVerificationResult = {
  isValid: boolean
  isWhatsAppCapable: boolean
  type: 'mobile' | 'landline' | 'invalid' | 'missing'
  operator?: string
  formattedPhone?: string
  displayPhone: string
  message: string
}

export function verifyPhoneNumber(phone?: string | null): PhoneVerificationResult {
  if (!phone || !phone.trim()) {
    return {
      isValid: false,
      isWhatsAppCapable: false,
      type: 'missing',
      displayPhone: '-',
      message: 'Nomor telepon belum diisi',
    }
  }

  const raw = phone.trim()
  const digits = raw.replace(/\D/g, '')

  // Check Landline (PSTN)
  let standardDigits = digits
  if (standardDigits.startsWith('62')) {
    standardDigits = '0' + standardDigits.slice(2)
  }

  const landlinePrefixes = ['021', '022', '024', '031', '0251', '0267', '0274', '0341', '0361', '061', '0711']
  const matchedLandline = landlinePrefixes.find((p) => standardDigits.startsWith(p))
  if (matchedLandline && !standardDigits.startsWith('08')) {
    return {
      isValid: true,
      isWhatsAppCapable: false,
      type: 'landline',
      displayPhone: raw,
      message: `Telepon Kantor / PSTN (${matchedLandline}) - Hubungi via telepon suara langsung`,
    }
  }

  // Check Indonesian Mobile GSM (WhatsApp capable)
  let cleanMobile = digits
  if (cleanMobile.startsWith('0')) {
    cleanMobile = '62' + cleanMobile.slice(1)
  }

  if (cleanMobile.startsWith('628') && cleanMobile.length >= 11 && cleanMobile.length <= 14) {
    let operator = 'GSM Indonesia'
    if (['0811', '0812', '0813', '0821', '0822', '0823', '0851', '0852', '0853'].some((p) => ('0' + cleanMobile.slice(2)).startsWith(p))) {
      operator = 'Telkomsel'
    } else if (['0814', '0815', '0816', '0855', '0856', '0857', '0858'].some((p) => ('0' + cleanMobile.slice(2)).startsWith(p))) {
      operator = 'Indosat Ooredoo'
    } else if (['0817', '0818', '0819', '0859', '0877', '0878', '0831', '0832', '0838'].some((p) => ('0' + cleanMobile.slice(2)).startsWith(p))) {
      operator = 'XL / Axis'
    } else if (['0895', '0896', '0897', '0898', '0899'].some((p) => ('0' + cleanMobile.slice(2)).startsWith(p))) {
      operator = 'Tri (3)'
    } else if (['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'].some((p) => ('0' + cleanMobile.slice(2)).startsWith(p))) {
      operator = 'Smartfren'
    }

    return {
      isValid: true,
      isWhatsAppCapable: true,
      type: 'mobile',
      operator,
      formattedPhone: cleanMobile,
      displayPhone: raw,
      message: `Nomor WhatsApp Seluler Valid (${operator})`,
    }
  }

  // Fallback check for international or other numbers
  if (digits.length >= 9 && digits.length <= 15) {
    let intlFormatted = digits
    if (intlFormatted.startsWith('0')) intlFormatted = '62' + intlFormatted.slice(1)
    return {
      isValid: true,
      isWhatsAppCapable: true,
      type: 'mobile',
      formattedPhone: intlFormatted,
      displayPhone: raw,
      message: 'Nomor telepon terdeteksi valid',
    }
  }

  return {
    isValid: false,
    isWhatsAppCapable: false,
    type: 'invalid',
    displayPhone: raw,
    message: 'Format nomor tidak valid (kurang dari 9 atau lebih dari 15 digit)',
  }
}

export function getWhatsAppStatus(b: Buyer): {
  status: WhatsAppStatus
  label: string
  badgeClass: string
  date?: string
} {
  const notes = b.notes || ''
  const match = notes.match(/\[WA:\s*([a-z_]+)(?:\s+([0-9-]+))?\]/i)

  if (match) {
    const rawStatus = match[1].toLowerCase() as WhatsAppStatus
    const date = match[2]

    switch (rawStatus) {
      case 'sent':
        return {
          status: 'sent',
          label: 'WA Terkirim',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          date,
        }
      case 'replied':
        return {
          status: 'replied',
          label: 'Buyer Membalas',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          date,
        }
      case 'sample_requested':
        return {
          status: 'sample_requested',
          label: 'Minta Sampel',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
          date,
        }
      case 'rejected':
        return {
          status: 'rejected',
          label: 'Nego / Pending',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          date,
        }
    }
  }

  return {
    status: 'uncontacted',
    label: 'Belum Dikontak',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
  }
}

export function encodeWhatsAppStatus(
  notes?: string | null,
  status?: WhatsAppStatus | string,
  date?: string
): string {
  const clean = (notes || '').replace(/\[WA:\s*[^\]]+\]/gi, '').trim()
  if (!status || status === 'uncontacted') return clean
  const dateStr = date || new Date().toISOString().split('T')[0]
  return `[WA: ${status} ${dateStr}] ${clean}`.trim()
}

