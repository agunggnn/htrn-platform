import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { encodeWhatsAppStatus, encodeBuyerNotes } from '@/lib/buyers-helper'
import { requireCrmAccess, crmCorsHeaders } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const authError = await requireCrmAccess(request)
    if (authError) return authError

    const body = await request.json()
    const { buyer_id, phone, channel = 'whatsapp', status, summary, date } = body

    if ((!buyer_id && !phone) || !status) {
      return NextResponse.json(
        { error: 'buyer_id atau phone dan status interaksi wajib diisi' },
        { status: 400, headers: crmCorsHeaders(request) }
      )
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch current buyer by buyer_id or phone
    let buyer = null

    if (buyer_id) {
      const { data, error: fetchErr } = await admin
        .from('buyers')
        .select('*')
        .eq('id', buyer_id)
        .single()
      if (!fetchErr && data) {
        buyer = data
      }
    } else if (phone) {
      const digits = phone.replace(/\D/g, '')
      let altDigits = digits
      if (digits.startsWith('62')) altDigits = '0' + digits.slice(2)
      else if (digits.startsWith('0')) altDigits = '62' + digits.slice(1)

      const { data: phoneMatches } = await admin
        .from('buyers')
        .select('*')
        .or(`phone.ilike.%${digits}%,phone.ilike.%${altDigits}%`)
        .limit(1)

      if (phoneMatches && phoneMatches.length > 0) {
        buyer = phoneMatches[0]
      }
    }

    if (!buyer) {
      return NextResponse.json(
        { error: 'Buyer tidak ditemukan di database HTRN' },
        { status: 404, headers: crmCorsHeaders(request) }
      )
    }

    // 2. Format updated notes
    const interactionDate = date || new Date().toISOString().split('T')[0]
    let updatedNotes = encodeWhatsAppStatus(buyer.notes, status, interactionDate)

    if (summary) {
      const logLine = `\n[Log ${interactionDate} via ${channel.toUpperCase()}]: ${summary}`
      updatedNotes = `${updatedNotes}${logLine}`
    }

    // 3. Auto advance stage if applicable
    const stageMatch = buyer.notes?.match(/\[Stage:\s*([a-z_]+)\]/i)
    let currentStage = stageMatch ? stageMatch[1] : (buyer.pipeline_stage || 'lead')

    if (status === 'sample_requested' && (currentStage === 'lead' || currentStage === 'target_outreach')) {
      currentStage = 'sample_sent'
    } else if (status === 'replied' && currentStage === 'lead') {
      currentStage = 'target_outreach'
    }

    const tierMatch = buyer.notes?.match(/\[Tier:\s*([a-z0-9_]+)\]/i)
    const scoreMatch = buyer.notes?.match(/\[Fit:\s*(\d+)%?\]/i)
    updatedNotes = encodeBuyerNotes(
      updatedNotes,
      currentStage,
      tierMatch ? tierMatch[1] : null,
      scoreMatch ? parseInt(scoreMatch[1], 10) : null
    )

    // 4. Update in Supabase
    const { data: updatedBuyer, error: updateErr } = await admin
      .from('buyers')
      .update({ notes: updatedNotes })
      .eq('id', buyer_id)
      .select()
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500, headers: crmCorsHeaders(request) })
    }

    try {
      revalidatePath('/buyers')
      revalidatePath(`/buyers/${buyer_id}`)
      revalidatePath('/')
    } catch {
      // ignore revalidation edge cases
    }

    return NextResponse.json(
      {
        success: true,
        message: `Status interaksi WhatsApp berhasil dicatat: ${status}`,
        buyer: updatedBuyer,
      },
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
