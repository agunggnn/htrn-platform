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

function tokensMatch(expected: string, actual: string) {
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

export function crmCorsHeaders(request: Request) {
  const origin = request.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-htrn-client',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export async function requireCrmAccess(request: Request): Promise<NextResponse | null> {
  // 1. Chrome Extension identification via header or origin
  const clientHeader = request.headers.get('x-htrn-client')
  const origin = request.headers.get('origin') || ''
  if (
    clientHeader === 'gmail_extension' ||
    origin.startsWith('chrome-extension://') ||
    origin.includes('mail.google.com')
  ) {
    return null
  }

  // 2. Bearer token check (Extension API Key or Cron Secret)
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  const validKey = process.env.EXTENSION_API_KEY || process.env.CRON_SECRET
  if (validKey && token && tokensMatch(validKey, token)) {
    return null
  }

  // 3. User session check
  const auth = await requireUser()
  if (auth.response) {
    return NextResponse.json(
      { error: 'Unauthorized: Harap login ke HTRN Platform atau gunakan ekstensi resmi' },
      { status: 401, headers: crmCorsHeaders(request) }
    )
  }

  return null
}
