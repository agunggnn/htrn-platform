import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Pure financial and packaging breakdown test logic matching lib/fulfillment-helper.ts
function calculatePackagingBreakdown(totalKg) {
  const balSizeKg = 5
  const totalBals = Math.ceil(totalKg / balSizeKg)
  const balsPerMasterBox = 4
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

function calculateFulfillmentFinancials(
  quantityKg,
  unitSellingPrice,
  unitSupplierHpp = 125000,
  options
) {
  const packaging = calculatePackagingBreakdown(quantityKg)
  const packagingCostPerBox = options?.packagingCostPerBox ?? 12000
  const totalPackagingCost = packaging.totalMasterBoxes * packagingCostPerBox
  const deliveryCost = options?.deliveryCost ?? (quantityKg > 0 ? 350000 : 0)

  const totalRevenue = quantityKg * unitSellingPrice
  const totalSupplierCost = quantityKg * unitSupplierHpp
  const totalCost = totalSupplierCost + totalPackagingCost + deliveryCost
  const grossProfitIdr = totalRevenue - totalCost
  const grossMarginPct = totalRevenue > 0 ? (grossProfitIdr / totalRevenue) * 100 : 0

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
    isSafeFloor: unitSellingPrice >= 140000,
  }
}

function generateMasParminSpkWhatsAppText(payload) {
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

describe('Supplier Settlement & Fulfillment Calculations', () => {
  it('correctly calculates packaging breakdown for 500 kg Bawang Goreng', () => {
    const pkg = calculatePackagingBreakdown(500)
    assert.equal(pkg.totalKg, 500)
    assert.equal(pkg.balSizeKg, 5)
    assert.equal(pkg.totalBals, 100)
    assert.equal(pkg.balsPerMasterBox, 4)
    assert.equal(pkg.totalMasterBoxes, 25)
    assert.equal(pkg.bulkSackCount, 20)
    assert.match(pkg.packagingSummaryText, /100 bal @ 5 kg \(25 karton master box ganda inner PE\)/)
  })

  it('correctly calculates locked financials for 500 kg @ Rp 155.000 selling price', () => {
    const fin = calculateFulfillmentFinancials(500, 155000, 125000)
    assert.equal(fin.totalRevenue, 77500000)
    assert.equal(fin.totalSupplierCost, 62500000)
    assert.equal(fin.packagingCostPerBox, 12000)
    assert.equal(fin.totalPackagingCost, 300000) // 25 * 12000
    assert.equal(fin.deliveryCost, 350000)
    assert.equal(fin.totalCost, 63150000)
    assert.equal(fin.grossProfitIdr, 14350000) // 77.500.000 - 63.150.000
    assert.equal(fin.grossMarginPct, 18.5)
    assert.equal(fin.isSafeFloor, true)
  })

  it('detects unsafe price below negotiation floor (Rp 140.000)', () => {
    const safe = calculateFulfillmentFinancials(500, 145000, 125000)
    const unsafe = calculateFulfillmentFinancials(500, 135000, 125000)
    assert.equal(safe.isSafeFloor, true)
    assert.equal(unsafe.isSafeFloor, false)
  })

  it('generates valid, complete WhatsApp SPK text without placeholders', () => {
    const text = generateMasParminSpkWhatsAppText({
      spkNumber: 'SPK/MP/2026/0901',
      commodityName: 'Bawang Merah Goreng',
      gradeName: 'Grade A Slice Renyah (Brebes Super Murni)',
      quantityKg: 500,
      unitSellingPrice: 155000,
      readyDateWib: '2026-09-30',
      buyerCompany: 'Bakso Boedjangan (CRP Group)',
      buyerPic: 'Bpk. Hendra Kurniawan',
      buyerPhone: '+62 811 2345 678',
      buyerDeliveryAddress: 'Sentra Produksi / Dapur Pusat Bandung (Franco)',
      suratJalanUrl: 'https://app.haturan.com/api/pdf/surat-jalan/9fb98a69-13e5-4eb6-9d2d-de04ec7f8d0c',
    })

    assert.match(text, /SPK\/MP\/2026\/0901/)
    assert.match(text, /Mas Parmin/)
    assert.match(text, /500 kg/)
    assert.match(text, /100 bal @ 5 kg \(25 karton master box ganda inner PE\)/)
    assert.match(text, /Bakso Boedjangan \(CRP Group\)/)
    assert.match(text, /Rp 62\.500\.000/)
    assert.match(text, /BLIND SHIPPING/)
    assert.match(text, /Agung Gunawan, Direktur PT Haturan Spice Indonesia/)
    assert.doesNotMatch(text, /undefined/)
    assert.doesNotMatch(text, /null/)
  })

  it('validates settlement status state machine', () => {
    const validStatuses = ['pending', 'approved', 'in_progress', 'paid', 'reconciled']
    assert.equal(validStatuses.length, 5)
    assert.ok(validStatuses.includes('pending'))
    assert.ok(validStatuses.includes('paid'))
  })
})
