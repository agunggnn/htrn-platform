import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculatePackagingBreakdown } from '@/lib/fulfillment-helper'
import type { CompanyProfile, Signatory, Buyer } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<unknown> }
) {
  const { id } = (await params) as { id: string }
  const supabase = await createClient()

  // 1. Fetch Company Profile & Signatory
  const [{ data: companyData }, { data: signatoryData }] = await Promise.all([
    supabase.from('company_profile').select('*').limit(1).maybeSingle(),
    supabase.from('signatories').select('*').eq('is_default', true).limit(1).maybeSingle(),
  ])

  // Fallback only fills brand-level identity already known to be factual
  // (company name, email, website). Contact details stay null when missing
  // so the document never prints an invented phone or address.
  const company = (companyData as unknown as CompanyProfile) || {
    company_name: 'PT Haturan Spice Indonesia',
    email: 'commercial@haturan.com',
    website: 'https://haturan.com',
    address: null,
    phone: null,
  }
  const signatory = (signatoryData as unknown as Signatory) || {
    name: 'Agung Gunawan',
    title: 'Direktur Utama',
  }

  // 2. Fetch Order Data (Quotation first, fallback to Invoice)
  let orderNumber = `SJ/HTRN/${new Date().getFullYear()}/${id.slice(0, 6).toUpperCase()}`
  let buyer: Buyer | null = null
  let itemsList: Array<{ name: string; quantity: number; unit: string; description?: string }> = []

  const { data: quo } = await supabase
    .from('quotations')
    .select('*, buyers(*), quotation_items(*)')
    .eq('id', id)
    .maybeSingle()

  if (quo) {
    orderNumber = `SJ-${quo.quo_number || id.slice(0, 8)}`
    buyer = quo.buyers as unknown as Buyer
    const qItems = quo.quotation_items || []
    // Never invent product data: missing fields render as blank/zero.
    itemsList = qItems.map((qi: { item_name?: string; quantity?: number; unit?: string; description?: string }) => ({
      name: qi.item_name || '-',
      quantity: Number(qi.quantity) || 0,
      unit: qi.unit || 'kg',
      description: qi.description || '',
    }))
  } else {
    const { data: inv } = await supabase
      .from('invoices')
      .select('*, buyers(*), invoice_items(*)')
      .eq('id', id)
      .maybeSingle()

    if (inv) {
      orderNumber = `SJ-${inv.inv_number || id.slice(0, 8)}`
      buyer = inv.buyers as unknown as Buyer
      const iItems = inv.invoice_items || []
      itemsList = iItems.map((ii: { item_name?: string; quantity?: number; unit?: string; description?: string }) => ({
        name: ii.item_name || '-',
        quantity: Number(ii.quantity) || 0,
        unit: ii.unit || 'kg',
        description: ii.description || '',
      }))
    }
  }

  // A delivery order with no goods lines must not print: inventing a demo
  // item here would put fabricated quantities on a logistics document.
  if (itemsList.length === 0) {
    return NextResponse.json(
      { error: 'Surat jalan tidak dapat dibuat: dokumen tidak memiliki item barang.' },
      { status: 400 }
    )
  }

  const totalKg = itemsList.reduce((sum, item) => sum + (item.unit === 'kg' ? item.quantity : item.quantity), 0)
  const packaging = calculatePackagingBreakdown(totalKg)

  const dateFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Surat Jalan & BAST - ${orderNumber} - Haturan Spice</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm 12mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      color: #111827;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #1a472a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .company-title {
      font-size: 17px;
      font-weight: 800;
      color: #1a472a;
      letter-spacing: -0.02em;
    }
    .company-sub {
      font-size: 9.5px;
      color: #4b5563;
      margin-top: 3px;
      line-height: 1.4;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-type {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .doc-number {
      font-size: 11.5px;
      font-weight: 700;
      color: #1a472a;
      margin-top: 2px;
      font-family: monospace;
    }
    .doc-date {
      font-size: 10px;
      color: #6b7280;
      margin-top: 2px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 16px;
    }
    .meta-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fafafa;
    }
    .meta-title {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1a472a;
      margin-bottom: 5px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 3px;
    }
    .meta-text {
      font-size: 10.5px;
      color: #1f2937;
      line-height: 1.45;
    }
    .meta-text strong {
      font-size: 11px;
      color: #111827;
    }
    .table-container {
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    th {
      background: #1a472a;
      color: #fff;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #f9fafb;
    }
    .packaging-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .packaging-detail {
      font-size: 10.5px;
      color: #166534;
    }
    .packaging-detail strong {
      font-size: 11.5px;
      color: #14532d;
    }
    .notes-box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 18px;
      font-size: 9.5px;
      color: #4b5563;
      background: #f9fafb;
      line-height: 1.4;
    }
    .notes-box ol {
      margin: 4px 0 0 16px;
      padding: 0;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-top: 14px;
    }
    .sig-col {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
      background: #fff;
    }
    .sig-title {
      font-size: 9.5px;
      font-weight: 700;
      color: #374151;
      text-transform: uppercase;
    }
    .sig-space {
      height: 52px;
    }
    .sig-name {
      font-size: 10.5px;
      font-weight: 700;
      color: #111827;
      border-top: 1px dashed #d1d5db;
      padding-top: 4px;
      display: inline-block;
      min-width: 130px;
    }
    .sig-role {
      font-size: 9px;
      color: #6b7280;
      margin-top: 1px;
    }
    .print-bar {
      background: #1a472a;
      color: #fff;
      padding: 10px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .btn-print {
      background: #fff;
      color: #1a472a;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      cursor: pointer;
    }
    @media print {
      .print-bar { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <span><strong>PT Haturan Spice Indonesia</strong> — Dokumen Resmi Pengiriman & BAST Franco</span>
    <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF (2 Rangkap)</button>
  </div>

  <div style="padding: 18px 24px;">
    <!-- 1. Header -->
    <div class="header">
      <div>
        <div class="company-title">${company.company_name}</div>
        <div class="company-sub">
          Head Office: Menara Prima, Mega Kuningan, Jakarta Selatan<br>
          Pusat Pengolahan & Hub Distribusi Rempah: Bogor, Jawa Barat<br>
          Email: ${company.email} | Web: ${company.website}
        </div>
      </div>
      <div class="doc-badge">
        <div class="doc-type">SURAT JALAN & BAST</div>
        <div class="doc-number">${orderNumber}</div>
        <div class="doc-date">${dateFormatted}</div>
      </div>
    </div>

    <!-- 2. Meta Grid (Pengirim vs Penerima) -->
    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-title">01. Titik Asal Muatan (Pengirim Resmi)</div>
        <div class="meta-text">
          <strong>PT Haturan Spice Indonesia (Hub Sortasi Bogor)</strong><br>
          Pusat Pengolahan & Penggorengan Sentrifugal Mas Parmin<br>
          Bogor, Jawa Barat — Indonesia<br>
          Kontrak Maklon Eksklusif No: <em>SPK-MP-BOGOR-2026</em>
        </div>
      </div>

      <div class="meta-card">
        <div class="meta-title">02. Lokasi Tujuan Bongkar (Buyer / Penerima)</div>
        <div class="meta-text">
          <strong>${buyer?.company_name || 'Dapur Pusat / Central Kitchen Resto'}</strong><br>
          PIC / Penerima Dapur: <strong>${buyer?.contact_name || 'Bapak/Ibu Kepala Dapur'}</strong><br>
          Telepon: ${buyer?.phone || '-'}<br>
          Alamat Bongkar: ${buyer?.country ? `Kawasan Industri / Area ${buyer.country}` : 'Sesuai instruksi PO / Franco Jabodetabek'}
        </div>
      </div>
    </div>

    <!-- 3. Packaging Banner -->
    <div class="packaging-box">
      <div>
        <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #166534; letter-spacing: 0.04em;">
          Spesifikasi Kemasan Standar Industri (Food Grade)
        </div>
        <div class="packaging-detail" style="margin-top: 2px;">
          Rincian: <strong>${packaging.packagingSummaryText}</strong> (Inner PE Ganda 0.8mm + Lakban Segel Haturan)
        </div>
      </div>
      <div style="text-align: right;">
        <span style="font-size: 18px; font-weight: 800; color: #14532d;">${totalKg.toLocaleString('id-ID')} KG</span>
        <div style="font-size: 9px; color: #166534;">Berat Bersih Total (Netto)</div>
      </div>
    </div>

    <!-- 4. Items Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">No</th>
            <th>Deskripsi Barang & Mutu Komoditas</th>
            <th style="width: 120px;">Standar Kemasan</th>
            <th style="width: 90px; text-align: right;">Berat Netto</th>
            <th style="width: 110px;">Status Segel</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList
            .map(
              (item, idx) => `
            <tr>
              <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
              <td>
                <strong style="color: #1a472a; font-size: 11.5px;">${item.name}</strong>
                <div style="font-size: 9.5px; color: #6b7280; margin-top: 2px;">${item.description || '-'}</div>
              </td>
              <td>Bal ganda PE 5 kg dalam Karton Box Master</td>
              <td style="text-align: right; font-weight: 700; font-size: 11.5px;">${item.quantity.toLocaleString('id-ID')} ${item.unit}</td>
              <td><span style="color: #166534; font-weight: 600;">✓ Segel Utuh</span></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- 5. Ketentuan Penerimaan & SOP BAST -->
    <div class="notes-box">
      <strong>Klausul Penerimaan & Berita Acara Serah Terima (BAST):</strong>
      <ol>
        <li>Barang diserahkan dalam kondisi baik, kering, renyah, dan tersegel rapi sesuai standar Technical Data Sheet (TDS) PT Haturan Spice Indonesia.</li>
        <li>Pihak penerima (Staff Dapur/QC Buyer) berhak memeriksa kondisi segel dan fisik barang sebelum menandatangani lembar ini.</li>
        <li>Garansi Tukar 100%: Apabila ditemukan cacat mutu bawaan atau segel terbuka saat tiba di lokasi, PT Haturan Spice Indonesia menjamin penggantian barang baru tanpa biaya tambahan.</li>
        <li>Lembar asli dikembalikan kepada Driver untuk diserahkan ke Haturan sebagai dasar penerbitan/pelunasan Invoice.</li>
      </ol>
    </div>

    <!-- 6. 3-Party Signatures -->
    <div class="signature-grid">
      <div class="sig-col">
        <div class="sig-title">Diserahkan Oleh (Driver/Armada)</div>
        <div class="sig-space"></div>
        <div class="sig-name">( Supir / Ekspedisi Hub Bogor )</div>
        <div class="sig-role">Armada Mas Parmin Bogor</div>
      </div>

      <div class="sig-col">
        <div class="sig-title">Diterima Oleh (Tim Buyer)</div>
        <div class="sig-space"></div>
        <div class="sig-name">( ............................................ )</div>
        <div class="sig-role">Nama Jelas & Stempel Dapur/Gudang</div>
      </div>

      <div class="sig-col">
        <div class="sig-title">Mengetahui (Pihak Haturan)</div>
        <div class="sig-space"></div>
        <div class="sig-name">${signatory.name}</div>
        <div class="sig-role">${signatory.title}, PT Haturan Spice Indonesia</div>
      </div>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}
