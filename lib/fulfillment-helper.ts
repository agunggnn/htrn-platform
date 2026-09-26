/**
 * HTRN Fulfillment Engine - Maklon & Dropship Mas Parmin (Hub Bogor)
 * Facilitates 100% asset-light trading operations, packaging decomposition,
 * margin locking, and automated WhatsApp SPK generation.
 */

import { getCurrentBawangGorengMarketData } from './commodity-mentor'

export type PackagingBreakdown = {
  totalKg: number
  balSizeKg: number
  totalBals: number
  balsPerMasterBox: number
  totalMasterBoxes: number
  bulkSackCount: number // Opsi alternatif karung 25kg
  packagingSummaryText: string
}

export type FulfillmentFinancials = {
  quantityKg: number
  unitSellingPrice: number
  unitSupplierHpp: number
  totalRevenue: number
  totalSupplierCost: number
  packagingCostPerBox: number
  totalPackagingCost: number
  deliveryCost: number
  totalCost: number
  grossProfitIdr: number
  grossMarginPct: number
  isSafeFloor: boolean
}

export const BOX_PACKAGING_COST_IDR = 12000
export const DEFAULT_DELIVERY_COST_IDR = 350000

export type MasParminSpkPayload = {
  spkNumber: string
  quotationNumber?: string
  commodityName: string
  gradeCode: string
  gradeName: string
  quantityKg: number
  unitSellingPrice: number
  readyDateWib: string
  buyerCompany: string
  buyerPic: string
  buyerPhone: string
  buyerDeliveryAddress: string
  suratJalanUrl: string
  specialNotes?: string
}

/**
 * Calculates bal and master box packaging breakdown
 */
export function calculatePackagingBreakdown(totalKg: number): PackagingBreakdown {
  const balSizeKg = 5
  const totalBals = Math.ceil(totalKg / balSizeKg)
  const balsPerMasterBox = 4 // 4 bal @ 5kg = 20 kg per karton box
  const totalMasterBoxes = Math.ceil(totalBals / balsPerMasterBox)
  const bulkSackCount = Math.ceil(totalKg / 25)

  const packagingSummaryText = `${totalBals} bal @ ${balSizeKg} kg (${totalMasterBoxes} karton master box ganda inner PE)`

  return {
    totalKg,
    balSizeKg,
    totalBals,
    balsPerMasterBox,
    totalMasterBoxes,
    bulkSackCount,
    packagingSummaryText,
  }
}

/**
 * Calculates locked gross margin and cashflow split (including packaging & delivery)
 */
export function calculateFulfillmentFinancials(
  quantityKg: number,
  unitSellingPrice: number,
  unitSupplierHpp: number = 125000,
  options?: {
    deliveryCost?: number
    packagingCostPerBox?: number
  }
): FulfillmentFinancials {
  const packaging = calculatePackagingBreakdown(quantityKg)
  const packagingCostPerBox = options?.packagingCostPerBox ?? BOX_PACKAGING_COST_IDR
  const totalPackagingCost = packaging.totalMasterBoxes * packagingCostPerBox
  const deliveryCost = options?.deliveryCost ?? (quantityKg > 0 ? DEFAULT_DELIVERY_COST_IDR : 0)

  const totalRevenue = quantityKg * unitSellingPrice
  const totalSupplierCost = quantityKg * unitSupplierHpp
  const totalCost = totalSupplierCost + totalPackagingCost + deliveryCost
  const grossProfitIdr = totalRevenue - totalCost
  const grossMarginPct = totalRevenue > 0 ? (grossProfitIdr / totalRevenue) * 100 : 0
  const market = getCurrentBawangGorengMarketData()

  return {
    quantityKg,
    unitSellingPrice,
    unitSupplierHpp,
    totalRevenue,
    totalSupplierCost,
    packagingCostPerBox,
    totalPackagingCost,
    deliveryCost,
    totalCost,
    grossProfitIdr,
    grossMarginPct: Number(grossMarginPct.toFixed(1)),
    isSafeFloor: unitSellingPrice >= market.negotiationFloorPrice,
  }
}

/**
 * Generates official formatted WhatsApp instruction text for Mas Parmin
 */
export function generateMasParminSpkWhatsAppText(payload: MasParminSpkPayload): string {
  const packaging = calculatePackagingBreakdown(payload.quantityKg)
  const financials = calculateFulfillmentFinancials(payload.quantityKg, payload.unitSellingPrice)

  return `*SURAT PERINTAH KERJA & PENGIRIMAN (SPK MAKLON)*
No: *${payload.spkNumber}*
Kepada: *Mas Parmin (Pusat Pengolahan & Hub Sortasi Bogor)*
Dari: *PT Haturan Spice Indonesia*

Halo Mas Parmin, mohon dipersiapkan dan diproses pesanan komoditas Bawang Merah Goreng mutu industri dengan rincian berikut:

📦 *RINCIAN PRODUK & MUATAN:*
• Komoditas: *${payload.commodityName}*
• Mutu / Varietas: *${payload.gradeName}* (Brebes Murni, low-oil sentrifugal)
• Total Volume: *${payload.quantityKg.toLocaleString('id-ID')} kg*
• Standar Kemasan: *${packaging.packagingSummaryText}*
• Segel: Inner seal PE ganda food-grade + Karton master box polos (labeling PT Haturan Spice Indonesia)

📅 *JADWAL & TUJUAN PENGIRIMAN (FRANCO):*
• Target Siap Kirim: *${payload.readyDateWib}*
• Penerima: *${payload.buyerCompany}*
• PIC / Kontak Dapur: *${payload.buyerPic}* (${payload.buyerPhone || 'WhatsApp'})
• Alamat Pengiriman: ${payload.buyerDeliveryAddress || 'Sesuai konfirmasi PO'}

📄 *DOKUMEN SURAT JALAN RESMI:*
Mohon cetak 2 rangkap Surat Jalan resmi ber-kop PT Haturan Spice Indonesia untuk dibawa driver saat pengiriman:
🔗 ${payload.suratJalanUrl}

⚠️ *SOP PENTING PENGIRIMAN (BLIND SHIPPING):*
1. Gunakan kemasan polos / stiker PT Haturan Spice Indonesia (jangan gunakan identitas supplier lain).
2. Driver wajib meminta tanda tangan dan stempel/nama jelas penerima dapur pada Surat Jalan Haturan.
3. Setelah serah terima selesai, mohon fotokan lembar Surat Jalan yang sudah ditandatangani dan kirimkan ke nomor ini untuk pencairan dana.

Biaya modal yang dialokasikan: *Rp ${financials.totalSupplierCost.toLocaleString('id-ID')}* (HPP modal Rp ${financials.unitSupplierHpp.toLocaleString('id-ID')}/kg).
${payload.specialNotes ? `\nCatatan Khusus: ${payload.specialNotes}\n` : ''}
Terima kasih atas kerja samanya, Mas Parmin.
- Agung Gunawan, Direktur PT Haturan Spice Indonesia`.trim()
}
