import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  encodeBuyerKycNotes,
  parseBuyerKyc,
  validateLegalityDoc,
  type KycStatus,
} from '@/lib/kyc-helper'
import type { Buyer } from '@/types'
import { requireUser, tokensMatch } from '@/lib/api-auth'
import { getSecret } from '@/lib/secrets-helper'

export async function POST(request: Request) {
  try {
    const auth = await requireUser()
    if (auth.response) return auth.response

    const body = await request.json()
    const {
      buyer_id,
      status = 'pending',
      credit_limit = 0,
      allowed_terms = 'CBD',
      tax_id,
      nib,
      verified_by,
      getcontact_tags,
      getcontact_name,
      director_pin,
    } = body

    if (!buyer_id) {
      return NextResponse.json({ error: 'buyer_id wajib diisi' }, { status: 400 })
    }

    // Server-side authorization check for financial elevation or verified status (Fail-Closed)
    const isElevatedKyc = status === 'verified' || allowed_terms !== 'CBD' || Number(credit_limit) > 0
    if (isElevatedKyc) {
      const configuredPin = (await getSecret('DIRECTOR_PIN')) || process.env.DIRECTOR_PIN
      if (!configuredPin) {
        return NextResponse.json(
          {
            error:
              'Otorisasi Direktur gagal: DIRECTOR_PIN belum dikonfigurasi di Settings Vault. Penetapan status Terverifikasi, limit kredit, atau termin kredit diblokir (fail-closed) demi keamanan.',
          },
          { status: 403 }
        )
      }

      const providedPin = String(director_pin || '').trim()
      if (!tokensMatch(configuredPin, providedPin)) {
        return NextResponse.json(
          {
            error:
              'Otorisasi Direktur ditolak: Penetapan status Terverifikasi, limit kredit, atau termin kredit memerlukan PIN Direktur yang valid.',
          },
          { status: 403 }
        )
      }
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

    // Require legal doc (NPWP or NIB) format validation before verified status can be granted
    if (status === 'verified') {
      const effectiveTaxId = tax_id !== undefined ? tax_id : buyer.tax_id
      const effectiveNib = nib !== undefined ? nib : currentKyc.nib
      const legalCheck = validateLegalityDoc(effectiveTaxId, effectiveNib)
      if (!legalCheck.valid) {
        return NextResponse.json({ error: legalCheck.error }, { status: 400 })
      }
    }

    // 2. Prepare updated KYC profile
    const today = new Date().toISOString().split('T')[0]
    const effectiveVerifier =
      status === 'verified'
        ? verified_by?.trim() || `${auth.user?.email || 'Agung Gunawan'} (Otorisasi Direktur)`
        : null

    const updatedProfile = {
      ...currentKyc,
      status: status as KycStatus,
      isVerified: status === 'verified',
      verifiedAt: status === 'verified' ? today : null,
      verifiedBy: effectiveVerifier,
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
