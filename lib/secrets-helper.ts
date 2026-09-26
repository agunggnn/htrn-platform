import crypto from 'crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export type SecretCategory = 'getcontact' | 'chatwoot' | 'ai' | 'security' | 'database'

export type SecretDefinition = {
  key: string
  label: string
  description: string
  category: SecretCategory
  secretRef: string
  isSecret: boolean
  placeholder?: string
}

export const KNOWN_SECRET_DEFINITIONS: SecretDefinition[] = [
  // 1. Getcontact Intelligence
  {
    key: 'GETCONTACT_TOKEN',
    label: 'Token Sesi Getcontact (X-Token)',
    description: 'Token sesi aktif dari aplikasi Android/Web Getcontact untuk verifikasi nomor & tag reputasi pembeli.',
    category: 'getcontact',
    secretRef: 'secretRef:getcontact-token',
    isSecret: true,
    placeholder: 'eyJhbGciOi...',
  },
  {
    key: 'GETCONTACT_FINAL_KEY',
    label: 'Getcontact AES-256 Final Key (Hex)',
    description: 'Kunci hex 64-karakter untuk dekripsi payload response Getcontact v2.8.',
    category: 'getcontact',
    secretRef: 'secretRef:getcontact-final-key',
    isSecret: true,
    placeholder: '64-character hex key...',
  },
  {
    key: 'GETCONTACT_HMAC_KEY',
    label: 'Getcontact HMAC Signature Key (Hex)',
    description: 'Kunci HMAC-SHA256 untuk memvalidasi signature request ke server Getcontact.',
    category: 'getcontact',
    secretRef: 'secretRef:getcontact-hmac-key',
    isSecret: true,
    placeholder: '6974636c69656e746b657932303233',
  },

  // 2. Chatwoot & WhatsApp Cloud API
  {
    key: 'CHATWOOT_BASE_URL',
    label: 'Chatwoot Base URL',
    description: 'Alamat instance Chatwoot (default: https://app.chatwoot.com).',
    category: 'chatwoot',
    secretRef: 'secretRef:chatwoot-base-url',
    isSecret: false,
    placeholder: 'https://app.chatwoot.com',
  },
  {
    key: 'CHATWOOT_API_KEY',
    label: 'Chatwoot User API Access Token',
    description: 'Token akses otentikasi user/bot Chatwoot untuk mengirim pesan WhatsApp secara otonom.',
    category: 'chatwoot',
    secretRef: 'secretRef:chatwoot-api-key',
    isSecret: true,
    placeholder: 'Token akses API Chatwoot...',
  },
  {
    key: 'CHATWOOT_ACCOUNT_ID',
    label: 'Chatwoot Account ID',
    description: 'Nomor identifikasi akun Chatwoot (contoh: 1 atau 10243).',
    category: 'chatwoot',
    secretRef: 'secretRef:chatwoot-account-id',
    isSecret: false,
    placeholder: '1',
  },
  {
    key: 'CHATWOOT_WEBHOOK_SECRET',
    label: 'Chatwoot Webhook Secret',
    description: 'Token pengaman verifikasi payload webhook masuk dari Chatwoot ke HTRN Platform.',
    category: 'chatwoot',
    secretRef: 'secretRef:chatwoot-webhook-secret',
    isSecret: true,
    placeholder: 'Token rahasia webhook...',
  },

  // 3. AI & JEV Engine
  {
    key: 'OPENROUTER_API_KEY',
    label: 'OpenRouter / DeepSeek API Key',
    description: 'Kunci API LLM untuk penalaran lanjutan JEV System 2 (ekstraksi purchase order & negosiasi kompleks).',
    category: 'ai',
    secretRef: 'secretRef:openrouter-api-key',
    isSecret: true,
    placeholder: 'sk-or-v1-...',
  },
  {
    key: 'GEMINI_API_KEY',
    label: 'Google Gemini API Key',
    description: 'Kunci API Google Gemini untuk OCR dokumen, perbandingan harga, dan analisis bukti bayar.',
    category: 'ai',
    secretRef: 'secretRef:gemini-api-key',
    isSecret: true,
    placeholder: 'AIzaSy...',
  },

  // 4. Direktur Security & PIN
  {
    key: 'DIRECTOR_PIN',
    label: 'PIN Otorisasi Direktur Utama',
    description: 'PIN 6-digit keamanan untuk persetujuan harga di bawah floor price (Rp 140k) atau kenaikan plafon kredit.',
    category: 'security',
    secretRef: 'secretRef:director-approval-pin',
    isSecret: true,
    placeholder: '6-digit PIN rahasia...',
  },
]

// Server encryption key derivation
function getMasterKey(): Buffer {
  const seed =
    process.env.HETZER_MASTER_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'htrn-vault-internal-master-key-seed-2026'
  return crypto.createHash('sha256').update(seed).digest()
}

/**
 * Encrypt plaintext using AES-256-GCM
 */
export function encryptVaultSecret(plainText: string): string {
  const iv = crypto.randomBytes(12)
  const key = getMasterKey()
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export function decryptVaultSecret(cipherPayload: string): string | null {
  try {
    const parts = cipherPayload.split(':')
    if (parts.length !== 3) return null

    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = Buffer.from(parts[2], 'hex')
    const key = getMasterKey()

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch (err) {
    console.error('[Vault] Decryption error:', err)
    return null
  }
}

/**
 * Mask sensitive value for safe UI presentation
 */
export function maskSecretValue(val?: string | null): string {
  if (!val) return ''
  if (val.length <= 6) return '••••••••'
  const tail = val.slice(-4)
  return `••••••••••••${tail}`
}

// In-memory memory cache to avoid unnecessary DB roundtrips
const memoryCache = new Map<string, { value: string; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 1000 // 1 minute

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Centralized runtime secret resolver.
 * Priority:
 * 1. process.env[key] (if not empty and not a secretRef string)
 * 2. In-memory cache
 * 3. Database vault (app_secrets table)
 */
export async function getSecret(key: string): Promise<string | null> {
  // 1. Check process.env
  const envVal = process.env[key]
  if (envVal && !envVal.startsWith('secretRef:') && envVal.trim() !== '') {
    return envVal.trim()
  }

  // 2. Check memory cache
  const cached = memoryCache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value
  }

  // 3. Query Database Vault
  try {
    const admin = getAdminClient()
    const { data, error } = await admin
      .from('app_secrets')
      .select('encrypted_value, is_active')
      .eq('key', key)
      .eq('is_active', true)
      .single()

    if (error || !data || !data.encrypted_value) {
      return null
    }

    const decrypted = decryptVaultSecret(data.encrypted_value)
    if (decrypted) {
      memoryCache.set(key, { value: decrypted, expiresAt: Date.now() + CACHE_TTL_MS })
      return decrypted
    }
  } catch (err) {
    console.error(`[Vault] Error resolving secret ${key}:`, err)
  }

  return null
}

/**
 * Saves or updates a secret securely in the vault
 */
export async function saveSecret(
  key: string,
  rawValue: string,
  category: SecretCategory = 'general' as SecretCategory,
  description?: string
): Promise<void> {
  const trimmed = rawValue.trim()
  if (!trimmed) return

  const def = KNOWN_SECRET_DEFINITIONS.find((d) => d.key === key)
  const secretRef = def?.secretRef || `secretRef:${key.toLowerCase().replace(/_/g, '-')}`
  const cat = def?.category || category
  const desc = def?.description || description || ''

  const encryptedValue = encryptVaultSecret(trimmed)
  const admin = getAdminClient()

  const { error } = await admin.from('app_secrets').upsert({
    key,
    encrypted_value: encryptedValue,
    secret_ref: secretRef,
    category: cat,
    description: desc,
    is_active: true,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(`Gagal menyimpan kredensial ${key}: ${error.message}`)
  }

  // Update in-memory cache and process.env immediately
  memoryCache.set(key, { value: trimmed, expiresAt: Date.now() + CACHE_TTL_MS })
  process.env[key] = trimmed
}

export type SecretMetadataItem = {
  key: string
  label: string
  description: string
  category: SecretCategory
  secretRef: string
  isSecret: boolean
  placeholder?: string
  isConfigured: boolean
  maskedValue: string
  source: 'env' | 'vault' | 'none'
  updatedAt?: string | null
}

/**
 * Returns metadata for all known secrets for the Settings UI.
 * Zero plaintext values are ever returned!
 */
export async function getSecretMetadataList(): Promise<SecretMetadataItem[]> {
  const admin = getAdminClient()
  const { data: dbSecrets } = await admin
    .from('app_secrets')
    .select('key, encrypted_value, updated_at, is_active')

  const dbMap = new Map<string, { encrypted_value: string; updated_at: string; is_active: boolean }>()
  if (dbSecrets) {
    for (const row of dbSecrets) {
      dbMap.set(row.key, row)
    }
  }

  const result: SecretMetadataItem[] = []

  for (const def of KNOWN_SECRET_DEFINITIONS) {
    const envVal = process.env[def.key]
    const dbRow = dbMap.get(def.key)

    let isConfigured = false
    let maskedValue = ''
    let source: 'env' | 'vault' | 'none' = 'none'
    let updatedAt: string | null = null

    if (envVal && !envVal.startsWith('secretRef:') && envVal.trim() !== '') {
      isConfigured = true
      source = 'env'
      maskedValue = def.isSecret ? maskSecretValue(envVal) : envVal
    } else if (dbRow && dbRow.is_active && dbRow.encrypted_value) {
      isConfigured = true
      source = 'vault'
      updatedAt = dbRow.updated_at
      if (def.isSecret) {
        maskedValue = `${def.secretRef} (Tersimpan & Terenkripsi)`
      } else {
        const decrypted = decryptVaultSecret(dbRow.encrypted_value)
        maskedValue = decrypted || ''
      }
    }

    result.push({
      key: def.key,
      label: def.label,
      description: def.description,
      category: def.category,
      secretRef: def.secretRef,
      isSecret: def.isSecret,
      placeholder: def.placeholder,
      isConfigured,
      maskedValue,
      source,
      updatedAt,
    })
  }

  return result
}
