import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireUser, isStaffOrDirector, tokensMatch } from '@/lib/api-auth'
import { getSecret } from '@/lib/secrets-helper'

export async function POST(request: Request) {
  try {
    // 1. Must be authenticated internal staff / director
    const auth = await requireUser()
    if (auth.response) return auth.response
    if (!isStaffOrDirector(auth.user)) {
      return NextResponse.json(
        { error: 'Akses Ditolak: Hanya staf internal atau direksi yang berhak memverifikasi dokumen.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { document_id, is_verified, director_pin, supplier_id, notes } = body

    if (!document_id) {
      return NextResponse.json({ error: 'document_id wajib disertakan' }, { status: 400 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 2. Fetch current document
    const { data: rawDoc, error: fetchErr } = await admin
      .from('claim_documents')
      .select('*, suppliers(id, name)')
      .eq('id', document_id)
      .maybeSingle()

    if (fetchErr || !rawDoc) {
      return NextResponse.json({ error: 'Dokumen klaim tidak ditemukan' }, { status: 404 })
    }

    // 3. Verification Elevation Check: Validating Director PIN (Fail-Closed)
    if (is_verified) {
      const configuredPin = (await getSecret('DIRECTOR_PIN')) || process.env.DIRECTOR_PIN
      if (!configuredPin) {
        return NextResponse.json(
          {
            error:
              'Otorisasi Gagal: DIRECTOR_PIN belum dikonfigurasi di Settings Vault. Verifikasi dokumen klaim mutu resmi diblokir (fail-closed) demi keamanan.',
          },
          { status: 403 }
        )
      }

      const providedPin = String(director_pin || '').trim()
      if (!tokensMatch(configuredPin, providedPin)) {
        return NextResponse.json(
          {
            error:
              'PIN Direktur tidak valid. Penandatanganan verifikasi dokumen resmi ditolak.',
          },
          { status: 403 }
        )
      }
    }

    // 4. Update document payload
    const nowIso = new Date().toISOString()
    const signerIdentity = auth.user?.email
      ? `${auth.user.email} (PIN Verified)`
      : 'Direktur Utama (PIN Verified)'

    const updatePayload: Record<string, unknown> = {
      is_verified: Boolean(is_verified),
      verified_at: is_verified ? nowIso : null,
      verified_by: is_verified ? signerIdentity : null,
      updated_at: nowIso,
    }

    // If revoking verification, also revoke is_active (unverified documents cannot be active!)
    if (!is_verified) {
      updatePayload.is_active = false
    }

    if (supplier_id !== undefined) {
      updatePayload.supplier_id = supplier_id || null
    }

    if (notes !== undefined) {
      updatePayload.notes = notes
    }

    const { data: updatedDoc, error: updateErr } = await admin
      .from('claim_documents')
      .update(updatePayload)
      .eq('id', document_id)
      .select('*, items(*), suppliers(*)')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document: updatedDoc,
      message: is_verified
        ? 'Dokumen berhasil diverifikasi sah dengan otorisasi Direktur.'
        : 'Status verifikasi dicabut dan akses publik otomatis dinonaktifkan.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
