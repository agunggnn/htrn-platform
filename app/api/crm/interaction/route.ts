import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { encodeWhatsAppStatus, encodeBuyerNotes } from '@/lib/buyers-helper'
import { requireUser } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const body = await request.json()
    const { buyer_id, channel = 'whatsapp', status, summary, date } = body

    if (!buyer_id || !status) {
      return NextResponse.json({ error: 'buyer_id dan status interaksi wajib diisi' }, { status: 400 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch current buyer
    const { data: buyer, error: fetchErr } = await admin
      .from('buyers')
      .select('*')
      .eq('id', buyer_id)
      .single()

    if (fetchErr || !buyer) {
      return NextResponse.json({ error: 'Buyer tidak ditemukan' }, { status: 404 })
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
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
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
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
