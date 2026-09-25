import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getCurrentBawangGorengMarketData } from '@/lib/commodity-mentor'

export async function GET(request: Request) {
  return handleMarketPriceSync(request)
}

export async function POST(request: Request) {
  return handleMarketPriceSync(request)
}

async function handleMarketPriceSync(request: Request) {
  // Same authorization as the other cron routes: without this, anyone on
  // the internet could trigger price_history writes.
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const todayWib = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(now)
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday
    const isMonday = dayOfWeek === 1

    const marketData = getCurrentBawangGorengMarketData()

    // 1. Fetch Bawang Merah Goreng item from items table
    const { data: items } = await admin
      .from('items')
      .select('id, name')
      .ilike('name', '%bawang%')
      .limit(5)

    let updatedCount = 0
    const insertedSnapshots: Array<{ item: string; grade: string; price: number; date: string }> = []

    if (items && items.length > 0) {
      for (const item of items) {
        // Fetch grades for this item
        const { data: grades } = await admin
          .from('item_grades')
          .select('id, grade_code, grade_description')
          .eq('item_id', item.id)

        if (grades && grades.length > 0) {
          await Promise.all(
            grades.map(async (g) => {
              // Benchmark price: Rp 165.000 for Grade A / Slice; Rp 155.000 for Grade B / Teri / Brebes Standard
              const benchmarkPrice =
                g.grade_code.includes('GRADE_B') || g.grade_code.includes('TERI')
                  ? marketData.sellingTiers.tier2_catering.price
                  : marketData.sellingTiers.tier1_horeca.price

              const noteTag = `[Monday Benchmark] Brebes raw: Rp ${marketData.rawFarmgatePricePerKg.toLocaleString('id-ID')}/kg (susut 3.8x). Modal HPP: Rp ${marketData.supplierHppModal.toLocaleString('id-ID')}, Floor: Rp ${marketData.negotiationFloorPrice.toLocaleString('id-ID')}`

              // Static internal estimate, NOT a market observation: it gets its
              // own source_type so it can never overwrite real 'market' rows
              // (the unique key includes source_type) and the UI can label it.
              const { data: existing } = await admin
                .from('price_history')
                .select('id')
                .eq('item_id', item.id)
                .eq('grade_code', g.grade_code)
                .eq('price_date', todayWib)
                .eq('source_type', 'benchmark')
                .limit(1)

              if (existing && existing.length > 0) {
                await admin
                  .from('price_history')
                  .update({ price_per_unit: benchmarkPrice, notes: noteTag })
                  .eq('id', existing[0].id)
              } else {
                await admin.from('price_history').insert([
                  {
                    item_id: item.id,
                    grade_code: g.grade_code,
                    price_per_unit: benchmarkPrice,
                    price_date: todayWib,
                    source_type: 'benchmark',
                    notes: noteTag,
                  },
                ])
              }

              insertedSnapshots.push({
                item: item.name,
                grade: g.grade_code,
                price: benchmarkPrice,
                date: todayWib,
              })
              updatedCount++
            })
          )
        }
      }
    }

    try {
      revalidatePath('/prices')
      revalidatePath('/')
    } catch {
      // ignore revalidation edge cases
    }

    const executiveBriefing = `
Ringkasan Intelijen Pasar Rempah Mingguan (${todayWib}):
• Pasokan Bahan Mentah: Sentra Brebes & Sumenep berada di kisaran Rp ${marketData.rawFarmgatePricePerKg.toLocaleString('id-ID')}/kg basah.
• Faktor Susut: 1 kg Bawang Goreng butuh ${marketData.shrinkageRatio} kg basah -> Biaya bahan mentah murni: Rp ${marketData.rawMaterialCostPerKgGoreng.toLocaleString('id-ID')}/kg.
• Biaya Produksi & Tiris Minyak Sentrifugal: Rp ${marketData.cookingOilAndProcessingCost.toLocaleString('id-ID')}/kg.
• HPP Modal Mas Parmin (Bogor): Rp ${marketData.supplierHppModal.toLocaleString('id-ID')}/kg.
• Batas Minimum Penawaran (Floor Price): Rp ${marketData.negotiationFloorPrice.toLocaleString('id-ID')}/kg.
• Harga Jual Rekomendasi: Tier 1 HORECA Rp 165.000 (Margin Rp 40.000), Tier 2 Catering Rp 155.000 (Margin Rp 30.000).
• Outlook Musiman: ${marketData.seasonalHarvestOutlook}
    `.trim()

    return NextResponse.json({
      success: true,
      isMonday,
      date: todayWib,
      updatedCount,
      insertedSnapshots,
      marketData,
      executiveBriefing,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error during market price scheduling'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
