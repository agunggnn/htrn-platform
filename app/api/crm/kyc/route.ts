import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { encodeBuyerKycNotes, parseBuyerKyc, type KycStatus } from '@/lib/kyc-helper'
import type { Buyer } from '@/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      buyer_id,
      status = 'verified',
      credit_limit = 0,
      allowed_terms = 'CBD',
      tax_id,
      nib,
      verified_by = 'Agung Gunawan (Direktur)',
      getcontact_tags,
      getcontact_name,
    } = body

    if (!buyer_id) {
      return NextResponse.json({ error: 'buyer_id wajib diisi' }, { status: 400 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Fetch current buyer
    const { data: rawBuyer, error: fetchErr } = await admin
      .from('buyers')
      .select('*')
      .eq('id', buyer_id)
      .single()

    if (fetchErr || !rawBuyer) {
      return NextResponse.json({ error: 'Buyer tidak ditemukan' }, { status: 404 })
    }

    const buyer = rawBuyer as Buyer
    const currentKyc = parseBuyerKyc(buyer)

    // 2. Prepare updated KYC profile
    const today = new Date().toISOString().split('T')[0]
    const updatedProfile = {
      ...currentKyc,
      status: status as KycStatus,
      isVerified: status === 'verified',
      verifiedAt: status === 'verified' ? today : null,
      verifiedBy: status === 'verified' ? verified_by : null,
      creditLimit: Number(credit_limit) || 0,
      allowedTerms: allowed_terms,
      taxId: tax_id !== undefined ? tax_id : buyer.tax_id,
      nib: nib !== undefined ? nib : currentKyc.nib,
      getcontactName: getcontact_name || currentKyc.getcontactName,
      getcontactTags: getcontact_tags || currentKyc.getcontactTags,
    }

    const updatedNotes = encodeBuyerKycNotes(buyer.notes, updatedProfile)

    // 3. Prepare database payload
    const updatePayload: Record<string, unknown> = {
      notes: updatedNotes,
      payment_terms: allowed_terms,
    }
    if (tax_id !== undefined) {
      updatePayload.tax_id = tax_id
    }

    // Try updating direct columns first
    const { data: updatedBuyer, error: updateErr } = await admin
      .from('buyers')
      .update(updatePayload)
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
        message: `Status KYC buyer berhasil diperbarui ke: ${status}`,
        buyer: updatedBuyer,
        kyc: updatedProfile,
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
    const message = err instanceof Error ? err.message : 'Server error saat update KYC'
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
