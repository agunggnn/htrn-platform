import crypto from 'crypto'
import { verifyPhoneNumber } from './buyers-helper'
import { getSecret } from './secrets-helper'

export type GetcontactResult = {
  success: boolean
  phoneNumber: string
  name: string | null
  provider: string | null
  tags: string[]
  spamCount: number
  riskLevel: 'low' | 'medium' | 'high' | 'unknown'
  isVerified: boolean
  source: 'getcontact_api' | 'getcontact_cache' | 'b2b_heuristic'
  rawResponse?: unknown
  message?: string
}

// Default constants from open-source reverse-engineered Getcontact clients (e.g. xdreizein666/getcontact-cli)
const GTC_API_URL = 'https://pbssrv-centraleu.ptc.getcontact.com/v2.8'
const DEFAULT_HMAC_KEY = '6974636c69656e746b657932303233' // Default HMAC key

function encryptAES256ECB(plainText: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex')
  const cipher = crypto.createCipheriv('aes-256-ecb', key, null)
  cipher.setAutoPadding(true)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  return encrypted.toString('base64')
}

function decryptAES256ECB(cipherBase64: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-ecb', key, null)
  decipher.setAutoPadding(true)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherBase64, 'base64')), decipher.final()])
  return decrypted.toString('utf8')
}

function generateSignature(payload: string, timestamp: number, hmacKeyHex: string): string {
  const key = Buffer.from(hmacKeyHex, 'hex')
  const data = `${timestamp}-${payload}`
  return crypto.createHmac('sha256', key).update(data).digest('hex')
}

/**
 * Perform live query to Getcontact reverse-engineered API endpoint
 */
async function queryGetcontactApi(
  formattedPhone: string,
  token: string,
  finalKeyHex: string,
  hmacKeyHex: string = DEFAULT_HMAC_KEY
): Promise<GetcontactResult | null> {
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const rawPayload = JSON.stringify({
      phoneNumber: `+${formattedPhone}`,
      countryCode: 'ID',
    })

    const encryptedData = encryptAES256ECB(rawPayload, finalKeyHex)
    const signature = generateSignature(rawPayload, timestamp, hmacKeyHex)

    // Call /v2.8/search endpoint
    const response = await fetch(`${GTC_API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-App-Version': '5.6.2',
        'X-Client-Device-Id': 'android-htrn-b2b',
        'X-Token': token,
        'X-Req-Timestamp': String(timestamp),
        'X-Req-Signature': signature,
        'X-Encrypted': '1',
        'User-Agent': 'okhttp/3.14.9',
      },
      body: JSON.stringify({ data: encryptedData }),
      signal: AbortSignal.timeout(6000),
    })

    if (!response.ok) {
      return null
    }

    const resJson = await response.json()
    if (!resJson.data) return null

    const decryptedStr = decryptAES256ECB(resJson.data, finalKeyHex)
    const decryptedObj = JSON.parse(decryptedStr)

    const profile = decryptedObj?.profile || {}
    const tagsList = decryptedObj?.tags || []
    const spamInfo = profile.spamInfo || {}
    const spamCount = typeof spamInfo.count === 'number' ? spamInfo.count : 0

    const tags: string[] = tagsList.map((t: { tag?: string; title?: string }) => t.tag || t.title || '').filter(Boolean)

    return {
      success: true,
      phoneNumber: formattedPhone,
      name: profile.name || null,
      provider: profile.provider || 'GSM Indonesia',
      tags: tags.slice(0, 15),
      spamCount,
      riskLevel: spamCount > 3 ? 'high' : spamCount > 0 ? 'medium' : 'low',
      isVerified: true,
      source: 'getcontact_api',
      rawResponse: decryptedObj,
    }
  } catch {
    // API failure (network, token expired, or rate-limited)
    return null
  }
}

/**
 * Intelligent B2B Fallback Profiler for when live API tokens are not configured or rate-limited
 */
function generateB2BHeuristicProfile(
  phone: string,
  companyName?: string | null,
  contactName?: string | null
): GetcontactResult {
  const phoneVerification = verifyPhoneNumber(phone)
  const formatted = phoneVerification.formattedPhone || phone.replace(/\D/g, '')

  // When token is not configured, do not invent/fabricate fake tags
  const tags: string[] = []

  return {
    success: false,
    phoneNumber: formatted,
    name: contactName || null,
    provider: phoneVerification.operator || 'GSM Indonesia',
    tags,
    spamCount: 0,
    riskLevel: 'unknown',
    isVerified: false,
    source: 'b2b_heuristic',
    message: 'Token Getcontact belum dikonfigurasi di App Secrets (GETCONTACT_TOKEN). Validasi format operator lokal valid, namun pengecekan reputasi/spam belum terverifikasi.',
  }
}

/**
 * Unified Getcontact Lookup Service
 */
export async function lookupGetcontact(
  phone: string,
  options?: {
    companyName?: string | null
    contactName?: string | null
    forceHeuristic?: boolean
  }
): Promise<GetcontactResult> {
  const cleanPhone = phone.trim().replace(/[^0-9+]/g, '')
  let formatted = cleanPhone
  if (formatted.startsWith('0')) formatted = '62' + formatted.slice(1)
  if (formatted.startsWith('+')) formatted = formatted.slice(1)

  const token = (await getSecret('GETCONTACT_TOKEN')) || process.env.GETCONTACT_TOKEN
  const finalKey = (await getSecret('GETCONTACT_FINAL_KEY')) || process.env.GETCONTACT_FINAL_KEY
  const hmacKey = (await getSecret('GETCONTACT_HMAC_KEY')) || process.env.GETCONTACT_HMAC_KEY || DEFAULT_HMAC_KEY

  if (!options?.forceHeuristic && token && finalKey) {
    const liveResult = await queryGetcontactApi(formatted, token, finalKey, hmacKey)
    if (liveResult && liveResult.success) {
      return liveResult
    }
  }

  // Fallback to heuristic profiling
  return generateB2BHeuristicProfile(formatted, options?.companyName, options?.contactName)
}

/**
 * Asynchronously enriches a buyer's profile with Getcontact intelligence in the background.
 * Safe to fire-and-forget (never blocks incoming webhook or web request).
 */
export async function triggerBackgroundGetcontactEnrichment(params: {
  buyerId: string
  phone: string
  companyName?: string | null
  contactName?: string | null
  force?: boolean
}): Promise<GetcontactResult | null> {
  const { buyerId, phone, companyName, contactName, force = false } = params
  if (!buyerId || !phone) return null

  try {
    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const { parseBuyerKyc, encodeBuyerKycNotes } = await import('@/lib/kyc-helper')
    type BuyerType = import('@/types').Buyer

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: rawBuyer } = await admin
      .from('buyers')
      .select('*')
      .eq('id', buyerId)
      .single()

    if (!rawBuyer) return null
    const buyer = rawBuyer as BuyerType
    const currentKyc = parseBuyerKyc(buyer)

    // Skip if already verified or checked recently with tags (unless forced)
    if (!force && currentKyc.lastCheckedAt && currentKyc.getcontactTags.length > 2) {
      return null
    }

    const result = await lookupGetcontact(phone, { companyName, contactName })
    const mergedTags = Array.from(new Set([...result.tags, ...currentKyc.getcontactTags])).slice(0, 15)

    const updatedNotes = encodeBuyerKycNotes(buyer.notes, {
      ...currentKyc,
      getcontactName: result.name || currentKyc.getcontactName,
      getcontactTags: mergedTags,
      spamCount: result.spamCount,
      riskLevel: result.riskLevel,
      lastCheckedAt: new Date().toISOString().split('T')[0],
    })

    await admin.from('buyers').update({ notes: updatedNotes }).eq('id', buyerId)

    return result
  } catch (err) {
    console.error('[Getcontact Background Enrichment] Error:', err)
    return null
  }
}
