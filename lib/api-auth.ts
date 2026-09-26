import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type UserAuth = {
  response: NextResponse | null
  supabase: SupabaseClient | null
  user: User | null
}

function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

function serviceUnavailable(message: string) {
  return NextResponse.json({ error: message }, { status: 503 })
}

export function tokensMatch(expected: string, actual: string) {
  const expectedBytes = Buffer.from(expected)
  const actualBytes = Buffer.from(actual)
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes)
}

export async function requireUser(): Promise<UserAuth> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { response: unauthorized(), supabase: null, user: null }
  }

  return { response: null, supabase, user }
}

export function isDirectorUser(user: User | null): boolean {
  if (!user) return false
  const role = String(user.app_metadata?.role || user.user_metadata?.role || '').toLowerCase()
  if (role === 'director' || role === 'admin' || role === 'superadmin') return true

  const directorEmails = (process.env.DIRECTOR_EMAILS || process.env.DIRECTOR_EMAIL || 'admin@haturan.com,director@haturan.com,agung@haturan.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())

  if (user.email && directorEmails.includes(user.email.toLowerCase())) {
    return true
  }
  return false
}

export function isStaffOrDirector(user: User | null): boolean {
  if (!user) return false
  if (isDirectorUser(user)) return true
  const role = String(user.app_metadata?.role || user.user_metadata?.role || '').toLowerCase()
  if (role === 'staff' || role === 'manager' || role === 'operator') return true
  if (user.email && user.email.toLowerCase().endsWith('@haturan.com')) return true
  return false
}

export function requireCronSecret(request: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return serviceUnavailable('Cron authentication is not configured')
  }

  const authorization = request.headers.get('authorization')
  const actual = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!actual || !tokensMatch(expected, actual)) {
    return unauthorized()
  }

  return null
}

export async function requireUserOrCron(request: Request): Promise<NextResponse | null> {
  const expected = process.env.CRON_SECRET
  if (expected) {
    const authorization = request.headers.get('authorization')
    const actual = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (actual && tokensMatch(expected, actual)) return null
  }

  const auth = await requireUser()
  return auth.response
}

export async function requireMcpAccess(request: Request): Promise<NextResponse | null> {
  const configuredKey = process.env.MCP_API_KEY
  const authorization = request.headers.get('authorization')
  const presentedKey = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''

  if (configuredKey && presentedKey && tokensMatch(configuredKey, presentedKey)) {
    return null
  }

  const auth = await requireUser()
  if (!auth.response) return null

  return configuredKey
    ? auth.response
    : serviceUnavailable('MCP authentication is not configured')
}

const ALLOWED_CRM_ORIGINS = [
  'https://app.haturan.com',
  'https://haturan.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

export function isAllowedCrmOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_CRM_ORIGINS.includes(origin)) return true
  // Allow official Chrome Extension origin if configured
  const configuredExtId = process.env.CHROME_EXTENSION_ID
  if (configuredExtId && origin === `chrome-extension://${configuredExtId}`) {
    return true
  }
  // In development mode, allow browser extension for local testing
  if (process.env.NODE_ENV === 'development' && origin.startsWith('chrome-extension://')) {
    return true
  }
  return false
}

export function crmCorsHeaders(request: Request) {
  const origin = request.headers.get('origin')
  const isAllowed = isAllowedCrmOrigin(origin)
  const allowedOrigin = isAllowed && origin ? origin : 'https://app.haturan.com'

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-htrn-client',
    ...(isAllowed ? { 'Access-Control-Allow-Credentials': 'true' } : {}),
  }
}

export async function requireCrmAccess(request: Request): Promise<NextResponse | null> {
  // 1. Bearer token check (Extension API Key or Cron Secret)
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
  const validKey = process.env.EXTENSION_API_KEY || process.env.CRON_SECRET
  if (validKey && token && tokensMatch(validKey, token)) {
    return null
  }

  // 2. User session check (Supabase authenticated session)
  const auth = await requireUser()
  if (!auth.response) {
    return null
  }

  // Reject unauthenticated requests; origin/headers alone are not accepted as proof
  return NextResponse.json(
    { error: 'Unauthorized: Akses CRM memerlukan Bearer token ekstensi atau sesi pengguna terautentikasi' },
    { status: 401, headers: crmCorsHeaders(request) }
  )
}
