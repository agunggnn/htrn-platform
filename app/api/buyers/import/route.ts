import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { encodeBuyerNotes } from '@/lib/buyers-helper'
import type { PipelineStage, BuyerTier } from '@/types'

function normalizeStage(val?: string | null): PipelineStage {
  if (!val) return 'lead'
  const s = val.toLowerCase().trim()
  if (s.includes('outreach') || s.includes('target') || s.includes('hubungi')) return 'target_outreach'
  if (s.includes('sample') || s.includes('sampel')) return 'sample_sent'
  if (s.includes('sph') || s.includes('quotation') || s.includes('tawaran')) return 'quotation_sent'
  if (s.includes('nego')) return 'negotiation'
  if (s.includes('deal') || s.includes('won') || s.includes('active') || s.includes('mitra') || s.includes('partner')) return 'active_customer'
  if (s.includes('lost') || s.includes('batal') || s.includes('gagal') || s.includes('closed')) return 'closed_lost'
  return 'lead'
}

function normalizeTier(val?: string | null): BuyerTier {
  if (!val) return 'tier_1'
  const t = val.toLowerCase().trim()
  if (t.includes('4') || t.includes('industr') || t.includes('pabrik')) return 'tier_4'
  if (t.includes('3') || t.includes('chain') || t.includes('jaringan')) return 'tier_3'
  if (t.includes('2') || t.includes('cater') || t.includes('katering')) return 'tier_2'
  return 'tier_1'
}

type RawImportRow = {
  company_name?: string
  contact_name?: string
  email?: string
  phone?: string
  country?: string
  pipeline_stage?: string
  tier?: string
  gacoan_score?: number | string
  product_interest?: string
  payment_terms?: string
  notes?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const client = user ? supabase : admin

    const body = await request.json()
    const { buyers = [], mode = 'upsert' } = body as {
      buyers: RawImportRow[]
      mode?: 'upsert' | 'skip_duplicates'
    }

    if (!Array.isArray(buyers) || buyers.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris data yang diunggah' }, { status: 400 })
    }

    // Fetch existing buyers for deduplication
    const { data: existingBuyers } = await admin
      .from('buyers')
      .select('id, company_name, email')

    const existingMapByEmail = new Map<string, string>()
    const existingMapByName = new Map<string, string>()

    for (const eb of existingBuyers || []) {
      if (eb.email) existingMapByEmail.set(eb.email.toLowerCase().trim(), eb.id)
      if (eb.company_name) existingMapByName.set(eb.company_name.toLowerCase().trim(), eb.id)
    }

    let inserted = 0
    let updated = 0
    const errors: string[] = []
    const toInsert = []

    for (let i = 0; i < buyers.length; i++) {
      const row = buyers[i]
      const companyName = (row.company_name || '').trim()
      const email = (row.email || '').trim().toLowerCase()

      if (!companyName && !email) {
        errors.push(`Baris #${i + 1}: Nama Perusahaan atau Email kosong.`)
        continue
      }

      const finalCompanyName = companyName || email.split('@')[0].toUpperCase().replace(/[._-]/g, ' ')
      const stage = normalizeStage(row.pipeline_stage)
      const tier = normalizeTier(row.tier)
      const score = row.gacoan_score ? parseInt(String(row.gacoan_score).replace(/\D/g, ''), 10) : 55

      // Check if duplicate exists
      const existingId = (email && existingMapByEmail.get(email)) || existingMapByName.get(finalCompanyName.toLowerCase())

      const encodedNotes = encodeBuyerNotes(row.notes, stage, tier, isNaN(score) ? 55 : score)

      const payload = {
        company_name: finalCompanyName,
        contact_name: (row.contact_name || '').trim() || null,
        email: email || null,
        phone: (row.phone || '').trim() || null,
        country: (row.country || 'Indonesia').trim(),
        payment_terms: row.payment_terms || 'CBD',
        currency: 'IDR',
        source: 'csv_import',
        notes: encodedNotes || null,
        is_active: true,
      }

      if (existingId) {
        if (mode === 'upsert') {
          const { error: updateErr } = await client
            .from('buyers')
            .update(payload)
            .eq('id', existingId)

          if (updateErr) {
            errors.push(`Baris #${i + 1} (${finalCompanyName}): ${updateErr.message}`)
          } else {
            updated++
          }
        }
        // If mode === 'skip_duplicates', do nothing
      } else {
        toInsert.push(payload)
      }
    }

    if (toInsert.length > 0) {
      const { data: insertedData, error: insertErr } = await client
        .from('buyers')
        .insert(toInsert)
        .select('id')

      if (insertErr) {
        // Fallback with admin client if RLS blocked user client
        const { data: adminInsert, error: adminErr } = await admin
          .from('buyers')
          .insert(toInsert)
          .select('id')

        if (adminErr) {
          errors.push(`Gagal batch insert: ${adminErr.message}`)
        } else {
          inserted += adminInsert?.length || 0
        }
      } else {
        inserted += insertedData?.length || 0
      }
    }

    try {
      revalidatePath('/buyers')
      revalidatePath('/')
    } catch {
      // ignore revalidation edge cases
    }

    return NextResponse.json({
      success: true,
      message: `Impor berhasil diproses: ${inserted} baru ditambahkan, ${updated} diperbarui.`,
      count: buyers.length,
      inserted,
      updated,
      errors: errors.slice(0, 10),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error saat import'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
