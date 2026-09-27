import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeFlourAdulteration, crawlShopeeWholesalePrices } from '../lib/shopee-crawler.ts'

describe('Shopee Crawler & Flour Adulteration Detector', () => {
  it('detects 100% pure Brebes onion for premium price and clean title', () => {
    const title = 'Bawang Goreng Asli Brebes Daun Mas Super Grade A 1kg (Tanpa Tepung)'
    const price = 155000
    const result = analyzeFlourAdulteration(title, price)

    assert.equal(result.isPure, true)
    assert.match(result.risk, /Murni 100% Brebes/)
  })

  it('detects high-risk tapioca adulteration when price is suspiciously low (< 95.000)', () => {
    const title = 'Bawang Goreng Renyah Tabur Soto 1kg'
    const price = 89000
    const result = analyzeFlourAdulteration(title, price)

    assert.equal(result.isPure, false)
    assert.match(result.risk, /Tinggi: Terindikasi Oplosan Tepung Tapioka/)
  })

  it('detects moderate flour mixture when title explicitly mentions tepung/campur/kriuk/ekonomis', () => {
    const title = 'Bawang Goreng Ekonomis Campuran Tepung Tipis Untuk Catering 1kg'
    const price = 98000
    const result = analyzeFlourAdulteration(title, price)

    assert.equal(result.isPure, false)
    assert.match(result.risk, /Campuran Tepung/)
  })

  it('crawls wholesale prices and returns valid metrics structure with fallback resilience', async () => {
    const crawlResult = await crawlShopeeWholesalePrices('bawang goreng brebes')

    assert.ok(crawlResult)
    assert.ok(Array.isArray(crawlResult.items))
    assert.ok(crawlResult.items.length > 0)
    assert.ok(crawlResult.metrics.totalItems > 0)
    assert.ok(crawlResult.metrics.avgPricePerKg > 50000)
    assert.ok(crawlResult.metrics.minPricePerKg <= crawlResult.metrics.maxPricePerKg)

    // Verify all items have valid IDR currency integer prices
    for (const item of crawlResult.items) {
      assert.equal(typeof item.price, 'number')
      assert.ok(item.price > 0)
      assert.equal(Number.isInteger(item.price), true)
      assert.ok(item.item_title.length > 0)
      assert.ok(typeof item.is_pure === 'boolean')
    }
  })
})

describe('Marketing ROI & Anti-Oplosan Calculations', () => {
  it('correctly calculates effective pure onion price inside adulterated product', () => {
    const adulteratedPrice = 95000
    const tapiocaPct = 25
    const tapiocaPricePerKg = 12000

    const tapiocaCostIn1Kg = (tapiocaPct / 100) * tapiocaPricePerKg // 3000
    const pureFraction = 1 - tapiocaPct / 100 // 0.75
    const effectivePrice = Math.round((adulteratedPrice - tapiocaCostIn1Kg) / pureFraction)

    // (95000 - 3000) / 0.75 = 92000 / 0.75 = 122667
    assert.equal(effectivePrice, 122667)
    assert.ok(effectivePrice > adulteratedPrice)
  })

  it('calculates portion servings and cost per bowl accurately', () => {
    const volumeKg = 200
    const purePrice = 150000
    const servingGramsPure = 10

    const totalCostPure = volumeKg * purePrice // 30.000.000
    const servings = (volumeKg * 1000) / servingGramsPure // 20.000 bowls
    const costPerBowl = totalCostPure / servings // 1.500

    assert.equal(servings, 20000)
    assert.equal(costPerBowl, 1500)

    // With adulterated onion needing 14g (1.4x)
    const servingGramsAdulterated = 14
    const servingsAdulteratedSamePack = (volumeKg * 1000) / servingGramsAdulterated
    assert.ok(servingsAdulteratedSamePack < servings)
  })
})

describe('Test Data Segregation & Quarantine', () => {
  function isTestData(record) {
    if (record.is_test === true) return true
    const num = (record.number || record.code || '').toUpperCase()
    return num.includes('TEST') || num.includes('DEMO') || num.includes('001')
  }

  it('identifies explicit is_test flag', () => {
    assert.equal(isTestData({ is_test: true, number: 'INV/2026/009' }), true)
    assert.equal(isTestData({ is_test: false, number: 'INV/2026/009' }), false)
  })

  it('defensively quarantines simulation numbers like TEST, DEMO, and 001', () => {
    assert.equal(isTestData({ number: 'INV/2026/DEMO-99' }), true)
    assert.equal(isTestData({ number: 'SPH/TEST/09' }), true)
    assert.equal(isTestData({ number: 'INV-2026-001' }), true)
    assert.equal(isTestData({ number: 'INV-2026-088' }), false)
  })
})
