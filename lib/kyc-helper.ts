import type { Buyer } from '@/types'
import { verifyPhoneNumber } from './buyers-helper'

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export type BuyerKycProfile = {
  status: KycStatus
  isVerified: boolean
  verifiedAt: string | null
  verifiedBy: string | null
  taxId: string | null
  nib: string | null
  businessCategory: string | null
  facilityAddress: string | null
  creditLimit: number
  allowedTerms: string
  // Getcontact & Personal Number Verification
  getcontactName: string | null
  getcontactTags: string[]
  spamCount: number
  riskLevel: 'low' | 'medium' | 'high' | 'unknown'
  phoneOperator: string | null
  isMobileWhatsapp: boolean
  lastCheckedAt: string | null
}

export function parseBuyerKyc(buyer: Buyer): BuyerKycProfile {
  const notes = buyer.notes || ''
  const phoneVerification = verifyPhoneNumber(buyer.phone)

  // 1. Parse KYC Status
  let status: KycStatus = 'unverified'
  let isVerified = false
  let verifiedAt: string | null = null
  let verifiedBy: string | null = null

  if (buyer.kyc_verified === true) {
    status = 'verified'
    isVerified = true
  }

  const kycMatch = notes.match(/\[KYC:\s*([a-z_]+)(?:\s+date=([0-9-]+))?(?:\s+by="([^"]+)")?\]/i)
  if (kycMatch) {
    status = (kycMatch[1].toLowerCase() as KycStatus) || 'unverified'
    isVerified = status === 'verified'
    verifiedAt = kycMatch[2] || null
    verifiedBy = kycMatch[3] || null
  }

  // 2. Parse Credit & Allowed Terms
  let creditLimit = 0
  let allowedTerms = buyer.payment_terms || 'CBD'

  const creditMatch = notes.match(/\[Credit:\s*limit=(\d+)(?:\s+terms="([^"]+)")?\]/i)
  if (creditMatch) {
    creditLimit = parseInt(creditMatch[1], 10) || 0
    if (creditMatch[2]) allowedTerms = creditMatch[2]
  }

  // 3. Parse NIB & Legal
  let nib: string | null = null
  const nibMatch = notes.match(/\[NIB:\s*([0-9a-zA-Z]+)\]/i)
  if (nibMatch) {
    nib = nibMatch[1]
  }

  // 4. Parse Getcontact Info
  let getcontactName: string | null = null
  const getcontactTags: string[] = []
  let spamCount = 0
  let riskLevel: 'low' | 'medium' | 'high' | 'unknown' = 'unknown'
  let lastCheckedAt: string | null = null

  const gtcMatch = notes.match(/\[GTC:\s*name="([^"]*)"\s*tags="([^"]*)"\s*spam=(\d+)(?:\s*risk=([a-z]+))?(?:\s*date=([0-9-]+))?\]/i)
  if (gtcMatch) {
    getcontactName = gtcMatch[1] || null
    if (gtcMatch[2]) {
      getcontactTags.push(...gtcMatch[2].split(',').map((t) => t.trim()).filter(Boolean))
    }
    spamCount = parseInt(gtcMatch[3], 10) || 0
    riskLevel = (gtcMatch[4] as 'low' | 'medium' | 'high' | 'unknown') || (spamCount > 3 ? 'high' : spamCount > 0 ? 'medium' : 'low')
    lastCheckedAt = gtcMatch[5] || null
  }

  return {
    status,
    isVerified,
    verifiedAt,
    verifiedBy,
    taxId: buyer.tax_id || null,
    nib,
    businessCategory: buyer.source || 'B2B Culinary',
    facilityAddress: buyer.country || 'Jabodetabek',
    creditLimit,
    allowedTerms,
    getcontactName: getcontactName || buyer.contact_name || null,
    getcontactTags,
    spamCount,
    riskLevel,
    phoneOperator: phoneVerification.operator || null,
    isMobileWhatsapp: phoneVerification.isWhatsAppCapable,
    lastCheckedAt,
  }
}

export function encodeBuyerKycNotes(
  existingNotes: string | null | undefined,
  profile: Partial<BuyerKycProfile>
): string {
  const clean = (existingNotes || '')
    .replace(/\[KYC:\s*[^\]]+\]/gi, '')
    .replace(/\[GTC:\s*[^\]]+\]/gi, '')
    .replace(/\[Credit:\s*[^\]]+\]/gi, '')
    .replace(/\[NIB:\s*[^\]]+\]/gi, '')
    .trim()

  const tags: string[] = []

  // 1. KYC tag
  if (profile.status) {
    const dateStr = profile.verifiedAt || new Date().toISOString().split('T')[0]
    const byStr = profile.verifiedBy ? ` by="${profile.verifiedBy}"` : ''
    tags.push(`[KYC: ${profile.status} date=${dateStr}${byStr}]`)
  }

  // 2. Credit tag
  if (profile.creditLimit !== undefined || profile.allowedTerms) {
    const limit = profile.creditLimit || 0
    const terms = profile.allowedTerms || 'CBD'
    tags.push(`[Credit: limit=${limit} terms="${terms}"]`)
  }

  // 3. NIB tag
  if (profile.nib) {
    tags.push(`[NIB: ${profile.nib.trim()}]`)
  }

  // 4. Getcontact tag
  if (profile.getcontactTags && profile.getcontactTags.length > 0) {
    const name = profile.getcontactName || ''
    const tagsStr = profile.getcontactTags.join(',')
    const spam = profile.spamCount || 0
    const risk = profile.riskLevel || 'unknown'
    const date = profile.lastCheckedAt || new Date().toISOString().split('T')[0]
    tags.push(`[GTC: name="${name}" tags="${tagsStr}" spam=${spam} risk=${risk} date=${date}]`)
  }

  return tags.length > 0 ? `${tags.join(' ')} ${clean}`.trim() : clean
}
