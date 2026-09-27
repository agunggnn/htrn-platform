import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Pure mathematical pricing pipeline test matching lib/pricing-pipeline.ts
function calculateDynamicPricingPipeline(inputs) {
  const rawPrice = Math.max(0, inputs.rawFarmgatePricePerKg)
  const shrinkage = inputs.shrinkageRatio ?? 3.8
  const procCost = inputs.processingCostPerKg ?? 11000
  const floorMargin = inputs.floorMarginPerKg ?? 15000

  const rawCost = Math.round(rawPrice * shrinkage)
  const hppModal = rawCost + procCost
  const floorPrice = hppModal + floorMargin

  const tiers = {
    tier1_horeca: {
      name: 'Tier 1 - HORECA / Resto Berjaringan',
      volumeRange: '100 - 499 kg',
      recommendedPricePerKg: hppModal + 40000,
      grossMarginIdrPerKg: 40000,
      grossMarginPct: Number(((40000 / (hppModal + 40000)) * 100).toFixed(1)),
    },
    tier2_catering: {
      name: 'Tier 2 - Catering & Central Kitchen',
      volumeRange: '500 - 999 kg',
      recommendedPricePerKg: hppModal + 30000,
      grossMarginIdrPerKg: 30000,
      grossMarginPct: Number(((30000 / (hppModal + 30000)) * 100).toFixed(1)),
    },
    tier3_industrial: {
      name: 'Tier 3 - Industrial Food Manufacturer',
      volumeRange: '1.000 - 2.000 kg',
      recommendedPricePerKg: hppModal + 24000,
      grossMarginIdrPerKg: 24000,
      grossMarginPct: Number(((24000 / (hppModal + 24000)) * 100).toFixed(1)),
    },
    tier4_enterprise: {
      name: 'Tier 4 - Enterprise & Multi-Branch Contract',
      volumeRange: '> 2.000 kg',
      recommendedPricePerKg: hppModal + 19000,
      grossMarginIdrPerKg: 19000,
      grossMarginPct: Number(((19000 / (hppModal + 19000)) * 100).toFixed(1)),
    },
  }

  return {
    rawFarmgatePricePerKg: rawPrice,
    shrinkageRatio: shrinkage,
    rawMaterialCostPerKgGoreng: rawCost,
    processingCostPerKg: procCost,
    supplierHppModal: hppModal,
    floorMarginPerKg: floorMargin,
    negotiationFloorPrice: floorPrice,
    sellingTiers: tiers,
  }
}

function validatePriceAgainstPipeline(quotedUnitPrice, rawFarmgatePrice = 30000) {
  const pipeline = calculateDynamicPricingPipeline({ rawFarmgatePricePerKg: rawFarmgatePrice })
  const marginIdr = quotedUnitPrice - pipeline.supplierHppModal
  const marginPct = quotedUnitPrice > 0 ? Number(((marginIdr / quotedUnitPrice) * 100).toFixed(1)) : 0

  const isBelowHpp = quotedUnitPrice < pipeline.supplierHppModal
  const isBelowFloor = quotedUnitPrice < pipeline.negotiationFloorPrice
  const isSafe = !isBelowHpp && !isBelowFloor

  let alertMessage
  if (isBelowHpp) {
    alertMessage = `BAHAYA BONCOS: Harga penawaran Rp ${quotedUnitPrice.toLocaleString('id-ID')} DI BAWAH HPP Modal Mas Parmin (Rp ${pipeline.supplierHppModal.toLocaleString('id-ID')}).`
  } else if (isBelowFloor) {
    alertMessage = `PERINGATAN MARGIN: Harga penawaran Rp ${quotedUnitPrice.toLocaleString('id-ID')} di bawah batas aman negosiasi (Floor Price: Rp ${pipeline.negotiationFloorPrice.toLocaleString('id-ID')}).`
  }

  return {
    isSafe,
    isBelowHpp,
    isBelowFloor,
    marginIdr,
    marginPct,
    supplierHppModal: pipeline.supplierHppModal,
    negotiationFloorPrice: pipeline.negotiationFloorPrice,
    alertMessage,
  }
}

describe('Dynamic Pricing Pipeline & JEV Cost Decomposition Engine', () => {
  it('correctly calculates normal baseline (Rp 30.000 raw farmgate price)', () => {
    const res = calculateDynamicPricingPipeline({ rawFarmgatePricePerKg: 30000 })
    assert.equal(res.rawMaterialCostPerKgGoreng, 114000) // 30000 * 3.8
    assert.equal(res.supplierHppModal, 125000) // 114000 + 11000
    assert.equal(res.negotiationFloorPrice, 140000) // 125000 + 15000
    assert.equal(res.sellingTiers.tier1_horeca.recommendedPricePerKg, 165000)
    assert.equal(res.sellingTiers.tier2_catering.recommendedPricePerKg, 155000)
    assert.equal(res.sellingTiers.tier3_industrial.recommendedPricePerKg, 149000)
    assert.equal(res.sellingTiers.tier4_enterprise.recommendedPricePerKg, 144000)
  })

  it('correctly calculates panen raya low price (Rp 20.000 raw price)', () => {
    const res = calculateDynamicPricingPipeline({ rawFarmgatePricePerKg: 20000 })
    assert.equal(res.rawMaterialCostPerKgGoreng, 76000) // 20000 * 3.8
    assert.equal(res.supplierHppModal, 87000) // 76000 + 11000
    assert.equal(res.negotiationFloorPrice, 102000) // 87000 + 15000
    assert.equal(res.sellingTiers.tier2_catering.recommendedPricePerKg, 117000)
  })

  it('correctly calculates paceklik high price (Rp 40.000 raw price)', () => {
    const res = calculateDynamicPricingPipeline({ rawFarmgatePricePerKg: 40000 })
    assert.equal(res.rawMaterialCostPerKgGoreng, 152000) // 40000 * 3.8
    assert.equal(res.supplierHppModal, 163000) // 152000 + 11000
    assert.equal(res.negotiationFloorPrice, 178000) // 163000 + 15000
    assert.equal(res.sellingTiers.tier2_catering.recommendedPricePerKg, 193000)
  })

  it('validates safe quotation price (Rp 155.000 @ Rp 30.000 raw price)', () => {
    const check = validatePriceAgainstPipeline(155000, 30000)
    assert.equal(check.isSafe, true)
    assert.equal(check.isBelowHpp, false)
    assert.equal(check.isBelowFloor, false)
    assert.equal(check.marginIdr, 30000)
    assert.equal(check.marginPct, 19.4)
  })

  it('catches dangerous quotation below HPP when raw price spikes (e.g. raw = Rp 38.000)', () => {
    // When raw price spikes to 38.000, HPP = (38000 * 3.8) + 11000 = 155.400
    // Quoting 155.000 would cause loss of 400/kg!
    const check = validatePriceAgainstPipeline(155000, 38000)
    assert.equal(check.isSafe, false)
    assert.equal(check.isBelowHpp, true)
    assert.match(check.alertMessage, /BAHAYA BONCOS/)
  })

  it('catches quotation below negotiation floor (e.g. Rp 135.000 @ Rp 30.000 raw price)', () => {
    const check = validatePriceAgainstPipeline(135000, 30000)
    assert.equal(check.isSafe, false)
    assert.equal(check.isBelowHpp, false)
    assert.equal(check.isBelowFloor, true)
    assert.match(check.alertMessage, /PERINGATAN MARGIN/)
  })
})
