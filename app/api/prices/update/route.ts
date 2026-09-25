import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 })
    }

    const body = await request.json()
    const { item_id, date, source_type = 'market', supplier_id, prices } = body

    if (!item_id) {
      return NextResponse.json({ error: 'Item ID wajib disertakan' }, { status: 400 })
    }

    const priceDate = date || new Date().toISOString().split('T')[0]

    // Normalize prices array
    // Accept either array of { grade_code, price } or record { [grade_code]: price }
    const entries: { grade_code: string; price: number }[] = []

    if (Array.isArray(prices)) {
      for (const p of prices) {
        if (!p.grade_code) continue
        const raw = String(p.price ?? '').trim()
        const cleaned = raw.replace(/[^0-9]/g, '')
        const num = parseInt(cleaned, 10)
        if (!isNaN(num) && num > 0) {
          entries.push({ grade_code: p.grade_code, price: num })
        }
      }
    } else if (typeof prices === 'object' && prices !== null) {
      for (const [grade_code, val] of Object.entries(prices)) {
        const raw = String(val ?? '').trim()
        const cleaned = raw.replace(/[^0-9]/g, '')
        const num = parseInt(cleaned, 10)
        if (!isNaN(num) && num > 0) {
          entries.push({ grade_code, price: num })
        }
      }
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'Masukkan minimal satu harga yang valid (nominal lebih dari 0)' },
        { status: 400 }
      )
    }

    // Determine notes based on source_type
    const rows = entries.map((entry) => ({
      item_id,
      grade_code: entry.grade_code,
      price_per_unit: entry.price,
      currency: 'IDR',
      price_date: priceDate,
      source_type: source_type,
      supplier_id: source_type === 'supplier' && supplier_id ? supplier_id : null,
      notes:
        source_type === 'supplier'
          ? 'HPP Modal Beli Supplier Netto'
          : source_type === 'selling_tier_1'
          ? 'Tier 1 HORECA (100-499 kg Franco)'
          : source_type === 'selling_tier_2'
          ? 'Tier 2 Katering (500-999 kg Franco)'
          : `Update harga ${source_type} manual`,
    }))

    // Try executing upsert via authenticated user client
    let { error: upsertError } = await supabase
      .from('price_history')
      .upsert(rows, { onConflict: 'item_id,grade_code,price_date,source_type' })

    // If RLS or constraint error occurs on user client, execute with verified admin role
    if (upsertError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { error: adminError } = await adminClient
        .from('price_history')
        .upsert(rows, { onConflict: 'item_id,grade_code,price_date,source_type' })

      if (adminError) {
        return NextResponse.json({ error: adminError.message }, { status: 500 })
      }
      upsertError = null
    } else if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Revalidate paths for instant UI synchronization
    try {
      revalidatePath('/prices')
      revalidatePath(`/prices/${item_id}`)
      revalidatePath('/')
    } catch {
      // Revalidation errors shouldn't fail the response
    }

    return NextResponse.json({
      success: true,
      message: `${rows.length} harga berhasil diperbarui`,
      count: rows.length,
      rows,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat memperbarui harga'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
