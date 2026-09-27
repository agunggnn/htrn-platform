import { NextRequest, NextResponse } from 'next/server'
import { crawlShopeeWholesalePrices } from '@/lib/shopee-crawler'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  return handleCrawl(request)
}

export async function POST(request: NextRequest) {
  return handleCrawl(request)
}

async function handleCrawl(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || 'bawang goreng brebes'

    const result = await crawlShopeeWholesalePrices(keyword)

    // Optionally persist crawl records to Supabase if table exists
    try {
      const supabase = await createClient()
      const recordsToInsert = result.items.slice(0, 10).map((item) => ({
        keyword: item.keyword,
        item_title: item.item_title,
        shop_name: item.shop_name,
        shop_location: item.shop_location,
        price: item.price,
        price_min: item.price_min,
        price_max: item.price_max,
        rating: item.rating,
        historical_sold: item.historical_sold,
        sold_display: item.sold_display,
        item_url: item.item_url,
        is_pure: item.is_pure,
        adulteration_risk: item.adulteration_risk,
        crawled_at: item.crawled_at,
      }))

      await supabase.from('shopee_price_scrapes').insert(recordsToInsert)
    } catch (dbErr) {
      // Non-blocking if table is not yet created in Supabase
      console.warn('Crawl persistence note:', (dbErr as Error).message)
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengambil ${result.items.length} listing harga grosir Shopee untuk "${keyword}".`,
      data: result,
    })
  } catch (error) {
    console.error('Error in shopee-crawler route:', error)
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Internal crawler error' },
      { status: 500 }
    )
  }
}
