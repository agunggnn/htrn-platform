import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { convertToCSV } from '@/lib/export'
import { getBuyerStage, getBuyerTier, getBuyerScore } from '@/lib/buyers-helper'
import type { Buyer } from '@/types'

const CSV_COLUMNS = [
  { key: 'company_name', label: 'Nama Perusahaan' },
  { key: 'contact_name', label: 'Nama Kontak (PIC)' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telepon / WhatsApp' },
  { key: 'country', label: 'Wilayah / Kota' },
  { key: 'pipeline_stage_label', label: 'Tahap Pipeline' },
  { key: 'tier_label', label: 'Volume Tier' },
  { key: 'gacoan_score_label', label: 'Gacoan Fit (%)' },
  { key: 'product_interest', label: 'Lini Produk' },
  { key: 'payment_terms', label: 'Syarat Pembayaran' },
  { key: 'currency', label: 'Mata Uang' },
  { key: 'source', label: 'Sumber Prospek' },
  { key: 'notes', label: 'Catatan Kebutuhan' },
  { key: 'created_at', label: 'Tanggal Terdaftar' },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const country = searchParams.get('country')?.trim()
    const stage = searchParams.get('stage')?.trim()
    const tier = searchParams.get('tier')?.trim()

    // 1. Verify user session or fallback to admin
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const client =
      user
        ? supabase
        : createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )

    let query = client
      .from('buyers')
      .select('*')
      .eq('is_active', true)
      .order('company_name', { ascending: true })

    if (q) query = query.ilike('company_name', `%${q}%`)
    if (country) query = query.eq('country', country)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let buyers = (data as Buyer[]) || []
    if (stage) {
      buyers = buyers.filter((b) => (b.pipeline_stage || getBuyerStage(b)) === stage)
    }
    if (tier) {
      buyers = buyers.filter((b) => (b.buyer_tier || getBuyerTier(b)) === tier)
    }

    const stageMap: Record<string, string> = {
      lead: '01. Lead Baru',
      target_outreach: '02. Target Outreach',
      sample_sent: '03. Sample Sent',
      quotation_sent: '04. SPH Sent',
      negotiation: '05. In Negotiation',
      active_customer: '06. Active Partner',
      closed_lost: '07. Closed Lost',
    }

    const tierMap: Record<string, string> = {
      tier_1: 'Tier 1: HORECA (100–499 kg)',
      tier_2: 'Tier 2: Catering (500–999 kg)',
      tier_3: 'Tier 3: Chain Resto (1–2 ton)',
      tier_4: 'Tier 4: Industrial (> 2 ton)',
    }

    const formattedRows = buyers.map((b) => {
      const resolvedStage = b.pipeline_stage || getBuyerStage(b)
      const resolvedTier = b.buyer_tier || getBuyerTier(b)
      const score = getBuyerScore(b)

      return {
        company_name: b.company_name,
        contact_name: b.contact_name || '',
        email: b.email || '',
        phone: b.phone || '',
        country: b.country || 'Indonesia',
        pipeline_stage_label: stageMap[resolvedStage] || resolvedStage,
        tier_label: tierMap[resolvedTier] || resolvedTier,
        gacoan_score_label: `${score}%`,
        product_interest: b.product_interest || 'Bawang Merah Goreng',
        payment_terms: b.payment_terms || 'CBD',
        currency: b.currency || 'IDR',
        source: b.source || 'crm_manual',
        notes: (b.notes || '').replace(/[\r\n]+/g, ' '),
        created_at: b.created_at ? b.created_at.split('T')[0] : '',
      }
    })

    const csvContent = convertToCSV(formattedRows, CSV_COLUMNS)
    const today = new Date().toISOString().split('T')[0]
    const filename = `htrn_buyers_prospek_${today}.csv`

    // Prepend UTF-8 BOM (\uFEFF) for seamless opening in Microsoft Excel without character corruption
    const bomCsv = '\uFEFF' + csvContent

    return new Response(bomCsv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error during CSV export'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
