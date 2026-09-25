import { NextResponse } from 'next/server'
import { lookupGetcontact } from '@/lib/getcontact'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { encodeBuyerKycNotes, parseBuyerKyc } from '@/lib/kyc-helper'
import type { Buyer } from '@/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { phone, company_name, contact_name, buyer_id } = body

    if (!phone) {
      return NextResponse.json({ error: 'Nomor telepon wajib diisi' }, { status: 400 })
    }

    const result = await lookupGetcontact(phone, {
      companyName: company_name,
      contactName: contact_name,
    })

    // If buyer_id is provided, auto-sync Getcontact tags to buyer notes
    if (buyer_id) {
      const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: rawBuyer } = await admin.from('buyers').select('*').eq('id', buyer_id).single()
      if (rawBuyer) {
        const buyer = rawBuyer as Buyer
        const currentKyc = parseBuyerKyc(buyer)

        // Merge tags
        const mergedTags = Array.from(new Set([...result.tags, ...currentKyc.getcontactTags])).slice(0, 15)

        const updatedNotes = encodeBuyerKycNotes(buyer.notes, {
          ...currentKyc,
          getcontactName: result.name || currentKyc.getcontactName,
          getcontactTags: mergedTags,
          spamCount: result.spamCount,
          riskLevel: result.riskLevel,
          lastCheckedAt: new Date().toISOString().split('T')[0],
        })

        await admin.from('buyers').update({ notes: updatedNotes }).eq('id', buyer_id)
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
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
    const message = err instanceof Error ? err.message : 'Server error saat query Getcontact'
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
