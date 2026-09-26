import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireCrmAccess, crmCorsHeaders } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const authError = await requireCrmAccess(request)
    if (authError) return authError

    const body = await request.json()
    const { conversation_id, agent_mode } = body

    if (!conversation_id || !agent_mode) {
      return NextResponse.json(
        { error: 'conversation_id dan agent_mode wajib diisi' },
        { status: 400, headers: crmCorsHeaders(request) }
      )
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const convIdNum = parseInt(conversation_id, 10)
    const { data, error } = await admin
      .from('chatwoot_conversations')
      .update({
        agent_mode,
        updated_at: new Date().toISOString(),
      })
      .or(`id.eq.${conversation_id},chatwoot_conversation_id.eq.${isNaN(convIdNum) ? -1 : convIdNum}`)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: crmCorsHeaders(request) })
    }

    return NextResponse.json(
      { success: true, agent_mode, updated: data },
      { headers: crmCorsHeaders(request) }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500, headers: crmCorsHeaders(request) })
  }
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: crmCorsHeaders(request),
  })
}
