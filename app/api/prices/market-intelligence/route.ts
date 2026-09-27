import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateDynamicPricingPipeline } from '@/lib/pricing-pipeline'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const rawPriceParam = searchParams.get('raw_price')
    const rawPrice = rawPriceParam ? Number(rawPriceParam) : 30000

    // 1. Fetch competitors / industry peers from buyers
    const { data: competitors } = await supabase
      .from('buyers')
      .select('id, company_name, contact_name, phone, notes, source, country')
      .or('source.eq.Competitor / Industry Peer,notes.ilike.%COMPETITOR%')
      .order('company_name', { ascending: true })

    // 2. Fetch latest raw material price if recorded in price_history
    const { data: latestRawRecord } = await supabase
      .from('price_history')
      .select('*')
      .eq('source_type', 'farmgate_raw')
      .order('price_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    const activeRawPrice = rawPriceParam ? rawPrice : Number(latestRawRecord?.price_per_unit || 30000)

    // 3. Compute dynamic pipeline
    const pipeline = calculateDynamicPricingPipeline({
      rawFarmgatePricePerKg: activeRawPrice,
    })

    return NextResponse.json({
      activeRawPrice,
      latestRawRecord,
      pipeline,
      competitors: competitors || [],
    })
  } catch (error) {
    console.error('Error in market-intelligence API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      type = 'raw_material', // 'raw_material' | 'competitor_quote'
      price_per_unit,
      notes,
      competitor_name,
      competitor_phone,
    } = body

    if (!price_per_unit || Number(price_per_unit) <= 0) {
      return NextResponse.json({ error: 'Harga harus valid dan lebih dari 0' }, { status: 400 })
    }

    const priceDate = new Date().toISOString().split('T')[0]

    // Fetch Bawang Merah Goreng item ID
    const { data: item } = await supabase
      .from('items')
      .select('id')
      .ilike('name', '%Bawang Merah Goreng%')
      .maybeSingle()

    const itemId = item?.id

    if (type === 'raw_material') {
      // Record raw material price in price_history
      const { error } = await supabase.from('price_history').insert({
        item_id: itemId,
        grade_code: 'RAW_FARMGATE',
        price_per_unit: Number(price_per_unit),
        currency: 'IDR',
        price_date: priceDate,
        source_type: 'farmgate_raw',
        notes: notes || 'Update harga bawang merah basah sentra Brebes/Pasar Induk',
      })

      if (error) {
        console.error('Error inserting raw price:', error)
      }

      const pipeline = calculateDynamicPricingPipeline({
        rawFarmgatePricePerKg: Number(price_per_unit),
      })

      return NextResponse.json({
        success: true,
        type: 'raw_material',
        updatedRawPrice: Number(price_per_unit),
        pipeline,
      })
    } else {
      // Record competitor benchmark quote
      await supabase.from('price_history').insert({
        item_id: itemId,
        grade_code: 'COMPETITOR_QUOTE',
        price_per_unit: Number(price_per_unit),
        currency: 'IDR',
        price_date: priceDate,
        source_type: 'competitor_quote',
        notes: `[Mystery Shopping: ${competitor_name || 'Kompetitor'} (${competitor_phone || '-'})] ${notes || ''}`,
      })

      return NextResponse.json({
        success: true,
        type: 'competitor_quote',
        recordedQuote: {
          competitor_name,
          price_per_unit: Number(price_per_unit),
          price_date: priceDate,
        },
      })
    }
  } catch (error) {
    console.error('Error posting market intelligence data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
