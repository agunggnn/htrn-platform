/**
 * HTRN Dynamic Pricing Pipeline & JEV Cost Decomposition Engine
 * Mathematically links raw farmgate prices (bawang merah basah Brebes) to
 * shrinkage factor, processing costs, Mas Parmin HPP, floor prices, and volume tiers.
 */

export type PricingPipelineInputs = {
  rawFarmgatePricePerKg: number // e.g. 30000
  shrinkageRatio?: number // default 3.8
  processingCostPerKg?: number // default 11000
  floorMarginPerKg?: number // default 15000
}

export type SellingTierGuidance = {
  name: string
  tierCode: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'
  volumeRange: string
  recommendedPricePerKg: number
  grossMarginIdrPerKg: number
  grossMarginPct: number
  description: string
}

export type PricingPipelineResult = {
  rawFarmgatePricePerKg: number
  shrinkageRatio: number
  rawMaterialCostPerKgGoreng: number
  processingCostPerKg: number
  supplierHppModal: number
  floorMarginPerKg: number
  negotiationFloorPrice: number
  sellingTiers: {
    tier1_horeca: SellingTierGuidance
    tier2_catering: SellingTierGuidance
    tier3_industrial: SellingTierGuidance
    tier4_enterprise: SellingTierGuidance
  }
}

export const DEFAULT_SHRINKAGE_RATIO = 3.8
export const DEFAULT_PROCESSING_COST = 11000
export const DEFAULT_FLOOR_MARGIN = 15000

/**
 * Calculates real-time cost cascade from raw agricultural material to final B2B selling price
 */
export function calculateDynamicPricingPipeline(
  inputs: PricingPipelineInputs
): PricingPipelineResult {
  const rawPrice = Math.max(0, inputs.rawFarmgatePricePerKg)
  const shrinkage = inputs.shrinkageRatio ?? DEFAULT_SHRINKAGE_RATIO
  const procCost = inputs.processingCostPerKg ?? DEFAULT_PROCESSING_COST
  const floorMargin = inputs.floorMarginPerKg ?? DEFAULT_FLOOR_MARGIN

  const rawCost = Math.round(rawPrice * shrinkage)
  const hppModal = rawCost + procCost
  const floorPrice = hppModal + floorMargin

  const tiers: PricingPipelineResult['sellingTiers'] = {
    tier1_horeca: {
      name: 'Tier 1 - HORECA / Resto Berjaringan',
      tierCode: 'tier_1',
      volumeRange: '100 - 499 kg',
      recommendedPricePerKg: hppModal + 40000,
      grossMarginIdrPerKg: 40000,
      grossMarginPct: Number(((40000 / (hppModal + 40000)) * 100).toFixed(1)),
      description: 'Franco Jabodetabek/Bandung, kemasan bal 5 kg ganda PE, garansi renyah 100%',
    },
    tier2_catering: {
      name: 'Tier 2 - Catering & Central Kitchen',
      tierCode: 'tier_2',
      volumeRange: '500 - 999 kg',
      recommendedPricePerKg: hppModal + 30000,
      grossMarginIdrPerKg: 30000,
      grossMarginPct: Number(((30000 / (hppModal + 30000)) * 100).toFixed(1)),
      description: 'Volume optimal seperti pesanan Bakso Boedjangan (500 kg @ CBD)',
    },
    tier3_industrial: {
      name: 'Tier 3 - Industrial Food Manufacturer',
      tierCode: 'tier_3',
      volumeRange: '1.000 - 2.000 kg',
      recommendedPricePerKg: hppModal + 24000,
      grossMarginIdrPerKg: 24000,
      grossMarginPct: Number(((24000 / (hppModal + 24000)) * 100).toFixed(1)),
      description: 'Pabrik saus/nugget, kemasan bulk karung zak 20-25 kg',
    },
    tier4_enterprise: {
      name: 'Tier 4 - Enterprise & Multi-Branch Contract',
      tierCode: 'tier_4',
      volumeRange: '> 2.000 kg',
      recommendedPricePerKg: hppModal + 19000,
      grossMarginIdrPerKg: 19000,
      grossMarginPct: Number(((19000 / (hppModal + 19000)) * 100).toFixed(1)),
      description: 'Kontrak pasokan volume besar berkala dengan komitmen panen',
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

/**
 * JEV Guardrail: Validates a proposed quotation price against dynamic raw material pipeline
 */
export function validatePriceAgainstPipeline(
  quotedUnitPrice: number,
  rawFarmgatePrice: number = 30000
): {
  isSafe: boolean
  isBelowHpp: boolean
  isBelowFloor: boolean
  marginIdr: number
  marginPct: number
  supplierHppModal: number
  negotiationFloorPrice: number
  alertMessage?: string
} {
  const pipeline = calculateDynamicPricingPipeline({ rawFarmgatePricePerKg: rawFarmgatePrice })
  const marginIdr = quotedUnitPrice - pipeline.supplierHppModal
  const marginPct = quotedUnitPrice > 0 ? Number(((marginIdr / quotedUnitPrice) * 100).toFixed(1)) : 0

  const isBelowHpp = quotedUnitPrice < pipeline.supplierHppModal
  const isBelowFloor = quotedUnitPrice < pipeline.negotiationFloorPrice
  const isSafe = !isBelowHpp && !isBelowFloor

  let alertMessage: string | undefined
  if (isBelowHpp) {
    alertMessage = `BAHAYA BONCOS: Harga penawaran Rp ${quotedUnitPrice.toLocaleString('id-ID')} DI BAWAH HPP Modal Mas Parmin (Rp ${pipeline.supplierHppModal.toLocaleString('id-ID')}). Rugi modal Rp ${Math.abs(marginIdr).toLocaleString('id-ID')}/kg.`
  } else if (isBelowFloor) {
    alertMessage = `PERINGATAN MARGIN: Harga penawaran Rp ${quotedUnitPrice.toLocaleString('id-ID')} di bawah batas aman negosiasi (Floor Price: Rp ${pipeline.negotiationFloorPrice.toLocaleString('id-ID')}). Margin tipis tidak menutup biaya logistik.`
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
