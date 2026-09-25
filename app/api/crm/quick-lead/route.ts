import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { encodeBuyerNotes } from '@/lib/buyers-helper'
import { requireCrmAccess, crmCorsHeaders } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const authError = await requireCrmAccess(request)
    if (authError) return authError

    const body = await request.json()
    const { company_name, contact_name, email, phone, tier = 'tier_1', pipeline_stage = 'lead', notes } = body

    if (!company_name && !email) {
      return NextResponse.json(
        { error: 'Nama perusahaan atau email wajib disertakan' },
        { status: 400, headers: crmCorsHeaders(request) }
      )
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Deduplication check
    if (email) {
      const { data: existing } = await admin
        .from('buyers')
        .select('id, company_name')
        .ilike('email', email.trim().toLowerCase())
        .limit(1)

      if (existing && existing.length > 0) {
        return NextResponse.json(
          {
            success: true,
            message: 'Buyer sudah terdaftar di database',
            buyer: existing[0],
            is_existing: true,
          },
          { headers: crmCorsHeaders(request) }
        )
      }
    }

    // Auto-generate name if only email provided
    const resolvedCompany =
      company_name ||
      (email ? email.split('@')[0].toUpperCase().replace(/[._-]/g, ' ') : 'Prospek Baru Gmail')

    const encodedNotes = encodeBuyerNotes(notes || null, pipeline_stage || 'target_outreach', tier || 'tier_1', 65)

    const newRecord = {
      company_name: resolvedCompany,
      contact_name: contact_name || null,
      email: email ? email.trim().toLowerCase() : null,
      phone: phone || null,
      country: 'Indonesia',
      currency: 'IDR',
      source: 'gmail_extension',
      notes: encodedNotes,
      is_active: true,
    }

    const { data, error } = await admin.from('buyers').insert([newRecord]).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: crmCorsHeaders(request) })
    }

    try {
      revalidatePath('/buyers')
      revalidatePath('/')
    } catch {
      // Revalidation errors shouldn't crash response
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Lead berhasil disimpan ke CRM HTRN',
        buyer: data,
        is_existing: false,
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
