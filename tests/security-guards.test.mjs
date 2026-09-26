import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { timingSafeEqual } from 'node:crypto'

// Replicate pure helper functions for unit test verification
function tokensMatch(expected, actual) {
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(actual)
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes)
}

function validateLegalityDoc(taxId, nib) {
  const cleanTaxId = (taxId || '').replace(/[^0-9]/g, '')
  const cleanNib = (nib || '').replace(/[^0-9]/g, '')

  if (!cleanTaxId && !cleanNib) {
    return {
      valid: false,
      error: 'Status Terverifikasi (Verified) wajib memiliki NPWP Perusahaan atau NIB yang sah.',
    }
  }

  if (cleanTaxId && cleanTaxId.length !== 15 && cleanTaxId.length !== 16) {
    return {
      valid: false,
      error: `Format NPWP tidak valid: "${taxId}". NPWP harus terdiri dari 15 atau 16 digit angka.`,
    }
  }

  if (cleanNib && cleanNib.length !== 13) {
    return {
      valid: false,
      error: `Format NIB tidak valid: "${nib}". NIB harus terdiri dari 13 digit angka resmi OSS.`,
    }
  }

  return { valid: true }
}

const ALLOWED_CRM_ORIGINS = [
  'https://app.haturan.com',
  'https://haturan.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

function isAllowedCrmOrigin(origin, env = {}) {
  if (!origin) return false
  if (ALLOWED_CRM_ORIGINS.includes(origin)) return true
  const configuredExtId = env.CHROME_EXTENSION_ID
  if (configuredExtId && origin === `chrome-extension://${configuredExtId}`) {
    return true
  }
  if (env.NODE_ENV === 'development' && origin.startsWith('chrome-extension://')) {
    return true
  }
  return false
}

function isDirectorUser(user, env = {}) {
  if (!user) return false
  const role = String(user.app_metadata?.role || user.user_metadata?.role || '').toLowerCase()
  if (role === 'director' || role === 'admin' || role === 'superadmin') return true

  const directorEmails = (env.DIRECTOR_EMAILS || env.DIRECTOR_EMAIL || 'admin@haturan.com,director@haturan.com,agung@haturan.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())

  if (user.email && directorEmails.includes(user.email.toLowerCase())) {
    return true
  }
  return false
}

describe('Security Guardrails & Hardening Test Suite', () => {
  describe('tokensMatch - Timing Safe Comparison', () => {
    test('returns true for identical secrets', () => {
      assert.strictEqual(tokensMatch('super-secret-pin-123456', 'super-secret-pin-123456'), true)
    })

    test('returns false for different tokens of same length', () => {
      assert.strictEqual(tokensMatch('super-secret-pin-123456', 'super-secret-pin-654321'), false)
    })

    test('returns false for different token lengths', () => {
      assert.strictEqual(tokensMatch('pin123', 'pin123456'), false)
    })
  })

  describe('validateLegalityDoc - Indonesian NPWP & NIB OSS Format', () => {
    test('rejects when both NPWP and NIB are missing or empty', () => {
      const res = validateLegalityDoc('', '')
      assert.strictEqual(res.valid, false)
      assert.match(res.error, /wajib memiliki NPWP Perusahaan atau NIB/)
    })

    test('accepts valid 15-digit formatted NPWP', () => {
      const res = validateLegalityDoc('01.234.567.8-901.000', null)
      assert.strictEqual(res.valid, true)
    })

    test('accepts valid 16-digit new format NPWP / NIK', () => {
      const res = validateLegalityDoc('3201234567890001', '')
      assert.strictEqual(res.valid, true)
    })

    test('rejects invalid NPWP length (e.g. 10 digits)', () => {
      const res = validateLegalityDoc('1234567890', null)
      assert.strictEqual(res.valid, false)
      assert.match(res.error, /NPWP harus terdiri dari 15 atau 16 digit/)
    })

    test('accepts valid 13-digit OSS NIB', () => {
      const res = validateLegalityDoc(null, '1234567890123')
      assert.strictEqual(res.valid, true)
    })

    test('rejects invalid NIB length (e.g. 9 digits)', () => {
      const res = validateLegalityDoc(null, '123456789')
      assert.strictEqual(res.valid, false)
      assert.match(res.error, /NIB harus terdiri dari 13 digit/)
    })
  })

  describe('isAllowedCrmOrigin - CORS Origin Restrictions', () => {
    test('allows official production domains', () => {
      assert.strictEqual(isAllowedCrmOrigin('https://app.haturan.com'), true)
      assert.strictEqual(isAllowedCrmOrigin('https://haturan.com'), true)
    })

    test('rejects unknown third-party domains', () => {
      assert.strictEqual(isAllowedCrmOrigin('https://malicious-site.com'), false)
      assert.strictEqual(isAllowedCrmOrigin('https://fake-haturan.com'), false)
    })

    test('rejects arbitrary chrome-extension in production without matching ID', () => {
      const env = { NODE_ENV: 'production', CHROME_EXTENSION_ID: 'official-ext-id-123' }
      assert.strictEqual(isAllowedCrmOrigin('chrome-extension://attacker-extension-id', env), false)
      assert.strictEqual(isAllowedCrmOrigin('chrome-extension://official-ext-id-123', env), true)
    })

    test('allows chrome-extension in development mode', () => {
      const env = { NODE_ENV: 'development' }
      assert.strictEqual(isAllowedCrmOrigin('chrome-extension://local-dev-id', env), true)
    })
  })

  describe('isDirectorUser - Role & Email Authorization', () => {
    test('recognizes director role in app_metadata', () => {
      const user = { email: 'staff@haturan.com', app_metadata: { role: 'director' } }
      assert.strictEqual(isDirectorUser(user), true)
    })

    test('recognizes director role in user_metadata', () => {
      const user = { email: 'staff@haturan.com', user_metadata: { role: 'admin' } }
      assert.strictEqual(isDirectorUser(user), true)
    })

    test('recognizes configured director email even without metadata role', () => {
      const user = { email: 'agung@haturan.com' }
      assert.strictEqual(isDirectorUser(user), true)
    })

    test('rejects normal staff or external email without director role', () => {
      const user = { email: 'sales@partner.com', user_metadata: { role: 'user' } }
      assert.strictEqual(isDirectorUser(user), false)
    })
  })
})
