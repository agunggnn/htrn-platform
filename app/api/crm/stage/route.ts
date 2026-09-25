import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { encodeBuyerNotes } from '@/lib/buyers-helper'
import { requireCrmAccess, crmCorsHeaders } from '@/lib/api-auth'

export async function PATCH(request: Request) {
  try {
    const authError = await requireCrmAccess(request)
    if (authError) return authError

    const body = await request.json()
    const { buyer_id, pipeline_stage, notes } = body

    if (!buyer_id || !pipeline_stage) {
      return NextResponse.json(
        { error: 'buyer_id dan pipeline_stage wajib disertakan' },
        { status: 400, headers: crmCorsHeaders(request) }
      )
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch existing buyer notes to preserve tier and fit score
    const { data: existingBuyer } = await admin
      .from('buyers')
      .select('notes')
      .eq('id', buyer_id)
      .single()

    const tierMatch = existingBuyer?.notes?.match(/\[Tier:\s*([a-z0-9_]+)\]/i)
    const scoreMatch = existingBuyer?.notes?.match(/\[Fit:\s*(\d+)%?\]/i)
    const existingTier = tierMatch ? tierMatch[1] : null
    const existingScore = scoreMatch ? parseInt(scoreMatch[1], 10) : null

    const baseNotes = notes !== undefined ? notes : existingBuyer?.notes
    const updatedNotes = encodeBuyerNotes(baseNotes, pipeline_stage, existingTier, existingScore)

    // Attempt direct column update first; fallback to notes-only update
    let updatedBuyer = null
    const { data: directData, error: directErr } = await admin
      .from('buyers')
      .update({ pipeline_stage, notes: updatedNotes })
      .eq('id', buyer_id)
      .select()
      .single()

    if (directErr) {
      // Column 'pipeline_stage' does not exist in schema cache -> persist into notes
      const { data: notesData, error: notesErr } = await admin
        .from('buyers')
        .update({ notes: updatedNotes })
        .eq('id', buyer_id)
        .select()
        .single()

      if (notesErr) {
        return NextResponse.json({ error: notesErr.message }, { status: 500, headers: crmCorsHeaders(request) })
      }
      updatedBuyer = { ...notesData, pipeline_stage }
    } else {
      updatedBuyer = directData
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
        message: `Pipeline stage diperbarui ke ${pipeline_stage}`,
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
