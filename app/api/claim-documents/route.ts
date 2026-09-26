import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ClaimDocument } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('item_id')
    const activeOnly = searchParams.get('active_only') === 'true'

    const supabase = await createClient()

    let query = supabase
      .from('claim_documents')
      .select('*, items(id, name), suppliers(id, name, region)')
      .order('created_at', { ascending: true })

    if (itemId) {
      query = query.eq('item_id', itemId)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error || !data) {
      // Graceful fallback if table not yet migrated
      return NextResponse.json({
        documents: [
          {
            id: 'fallback-halal',
            doc_type: 'halal_declaration',
            title: 'Jaminan Halal & Mutu Pangan',
            is_active: true,
            is_verified: false,
            generated_route: '/api/pdf/halal-declaration/bawang-goreng',
            supporting_file_url: null,
            notes: 'CV Daun Mas (Menunggu verifikasi fisik)',
          },
          {
            id: 'fallback-spec',
            doc_type: 'spec_sheet',
            title: 'Technical Data Sheet (TDS)',
            is_active: true,
            is_verified: false,
            generated_route: '/api/pdf/spec-sheet/bawang-goreng',
            supporting_file_url: null,
            notes: 'CV Daun Mas (Menunggu verifikasi fisik)',
          },
        ],
        isFallback: true,
      })
    }

    return NextResponse.json({
      documents: data as ClaimDocument[],
      isFallback: false,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
