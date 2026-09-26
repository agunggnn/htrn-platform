import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireUser, isStaffOrDirector } from '@/lib/api-auth'
import type { ClaimDocument } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID dokumen wajib disertakan' }, { status: 400 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch document record
    const { data: rawDoc, error: docErr } = await admin
      .from('claim_documents')
      .select('*, suppliers(id, name)')
      .eq('id', id)
      .maybeSingle()

    if (docErr || !rawDoc) {
      return NextResponse.json({ error: 'Dokumen klaim tidak ditemukan' }, { status: 404 })
    }

    const doc = rawDoc as ClaimDocument

    if (!doc.supporting_file_url) {
      return NextResponse.json(
        { error: 'Dokumen ini belum memiliki berkas fisik scan yang diunggah' },
        { status: 404 }
      )
    }

    // Access authorization check:
    // Only verified internal staff / director can view unverified or inactive documents
    const auth = await requireUser()
    const isInternalStaff = !auth.response && isStaffOrDirector(auth.user)

    if (!doc.is_active || !doc.is_verified) {
      if (!isInternalStaff) {
        return new NextResponse(
          `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Akses Berkas Terbatas - Haturan</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #1f2937; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 36px 32px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .badge { display: inline-block; padding: 4px 12px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; }
    h2 { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 10px; }
    p { font-size: 13px; line-height: 1.6; color: #4b5563; margin: 0 0 20px; }
    .foot { font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Akses Berkas Dikunci</div>
    <h2>Berkas Bukti Fisik Tidak Tersedia</h2>
    <p>Berkas lampiran fisik (Sertifikat / CoA) ini berstatus internal atau belum selesai diverifikasi secara sah bersama supplier, sehingga akses publik ditutup.</p>
    <div class="foot">PT Haturan Spice Indonesia · commercial@haturan.com</div>
  </div>
</body>
</html>`,
          {
            status: 403,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        )
      }
    }

    // Parse storage path from URL / reference
    const url = doc.supporting_file_url
    const bucket = 'claim-documents'
    let filePath = ''

    if (url.includes('/claim-documents/')) {
      filePath = decodeURIComponent(url.split('/claim-documents/')[1]?.split('?')[0] || '')
    } else if (url.startsWith('claim-documents/')) {
      filePath = decodeURIComponent(url.slice('claim-documents/'.length).split('?')[0] || '')
    } else {
      filePath = decodeURIComponent(url.replace(/^\/+/, '').split('?')[0] || '')
    }

    if (filePath) {
      // Create short-lived signed URL (TTL 15 minutes = 900 seconds)
      const { data: signedData, error: signErr } = await admin.storage
        .from(bucket)
        .createSignedUrl(filePath, 900)

      if (!signErr && signedData?.signedUrl) {
        return NextResponse.redirect(signedData.signedUrl, { status: 302 })
      }
    }

    return NextResponse.json(
      { error: 'Berkas tidak dapat diakses atau signed URL gagal dibuat dari storage privat.' },
      { status: 500 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
