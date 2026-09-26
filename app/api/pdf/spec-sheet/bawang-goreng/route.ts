import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtml as h } from '@/lib/html'
import { requireUser } from '@/lib/api-auth'
import type { CompanyProfile, Signatory } from '@/types'

export async function GET() {
  const supabase = await createClient()

  const [
    { data: company },
    { data: signatoryData },
    { data: claimDocData },
    { data: coaDocData },
  ] = await Promise.all([
    supabase.from('company_profile').select('*').limit(1).maybeSingle(),
    supabase.from('signatories').select('*').eq('is_default', true).limit(1).maybeSingle(),
    supabase
      .from('claim_documents')
      .select('*, suppliers(id, name, region)')
      .eq('doc_type', 'spec_sheet')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('claim_documents')
      .select('*, suppliers(id, name, region)')
      .eq('doc_type', 'coa')
      .limit(1)
      .maybeSingle(),
  ])

  // Check user session
  const auth = await requireUser()
  const isAuthenticated = !auth.response

  // Public/buyer access requires document to be explicitly active AND verified
  if (!isAuthenticated) {
    if (!claimDocData || !claimDocData.is_active || !claimDocData.is_verified) {
      const htmlInactive = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Akses Dokumen Belum Terbuka - Haturan</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #1f2937; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 36px 32px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .badge { display: inline-block; padding: 4px 12px; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-bottom: 16px; text-transform: uppercase; }
    h2 { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 10px; }
    p { font-size: 13px; line-height: 1.6; color: #4b5563; margin: 0 0 20px; }
    .foot { font-size: 11px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Akses Publik Belum Dibuka</div>
    <h2>Lembar Spesifikasi Belum Terverifikasi</h2>
    <p>Lembar Spesifikasi Teknis (TDS) Bawang Merah Goreng saat ini masih dalam proses sinkronisasi parameter uji mutu fisik bersama supplier atau akses publik dinonaktifkan. Dokumen hanya dapat diakses setelah diverifikasi secara sah.</p>
    <div class="foot">PT Haturan Spice Indonesia · commercial@haturan.com</div>
  </div>
</body>
</html>`
      return new NextResponse(htmlInactive, {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
  }

  const claimDoc = claimDocData as {
    id: string
    is_verified?: boolean
    supporting_file_url?: string | null
    suppliers?: { name?: string } | null
  } | null

  const isVerified = Boolean(claimDoc?.is_verified)
  const supplierName = claimDoc?.suppliers?.name || 'CV Daun Mas'
  // Use gated file route for CoA if coaDocData exists
  const coaUrl = coaDocData?.supporting_file_url && coaDocData?.id
    ? `/api/claim-documents/${coaDocData.id}/file`
    : null

  const companyProfile = company as unknown as CompanyProfile
  const signatory = signatoryData as unknown as Signatory

  const companyName = companyProfile?.company_name || 'PT Haturan Spice Indonesia'
  const email = companyProfile?.email || 'commercial@haturan.com'
  const website = companyProfile?.website || 'https://haturan.com'

  // Load product photo as base64 for reliable offline printing
  let photoDataUri = ''
  try {
    const photoPath = path.join(process.cwd(), 'public', 'products', 'fried-shallot-macro.jpg')
    if (fs.existsSync(photoPath)) {
      photoDataUri = `data:image/jpeg;base64,${fs.readFileSync(photoPath).toString('base64')}`
    }
  } catch {
    photoDataUri = ''
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Technical Data Sheet - Bawang Merah Goreng - Haturan Spice</title>
  <style>
    @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.45;
      color: #1f2937;
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
      margin-bottom: 16px;
    }
    .company-title {
      font-size: 18px;
      font-weight: 800;
      color: #1a472a;
      letter-spacing: -0.5px;
    }
    .company-sub {
      font-size: 10px;
      color: #4b5563;
      margin-top: 1px;
    }
    .doc-badge {
      text-align: right;
    }
    .doc-type {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-meta {
      font-size: 10px;
      color: #6b7280;
      margin-top: 2px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #1a472a;
      background: #f0fdf4;
      padding: 4px 8px;
      border-left: 3px solid #1a472a;
      margin-top: 14px;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 11px;
    }
    th, td {
      padding: 5px 8px;
      border: 1px solid #e5e7eb;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      width: 28%;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .highlight-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 10.5px;
    }
    .highlight-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 3px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .signature-box {
      text-align: left;
    }
    .signature-title {
      font-size: 10px;
      color: #6b7280;
      margin-bottom: 36px;
    }
    .signatory-name {
      font-weight: 700;
      color: #111827;
      text-decoration: underline;
    }
    .badge-pill {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 600;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .draft-watermark {
      position: fixed;
      top: 50%;
      left: 5%;
      right: 5%;
      transform: translateY(-50%) rotate(-28deg);
      font-size: 46px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.08);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 4px;
      pointer-events: none;
      z-index: 99;
      border: 5px dashed rgba(220, 38, 38, 0.12);
      padding: 24px 10px;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${!isVerified ? `<div class="draft-watermark">DRAFT — BELUM TERVERIFIKASI FISIK</div>` : ''}

  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-title">${h(companyName)}</div>
      <div class="company-sub">Fasilitas Sortasi, Pengolahan & Distribusi: Bogor, Jawa Barat</div>
      <div class="company-sub">Website: ${h(website)} · Email: ${h(email)}</div>
    </div>
    <div class="doc-badge">
      <div class="doc-type">Product Spec Sheet</div>
      <div class="doc-meta">Ref: TDS-HTRN-BMG-2026</div>
      <div class="doc-meta" style="${!isVerified ? 'color:#b45309;font-weight:700;' : ''}">Status: ${isVerified ? `Terverifikasi Mitra (${h(supplierName)})` : 'DRAFT (Belum Terverifikasi)'}</div>
      <div class="doc-meta">Tanggal: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>
  </div>

  ${!isVerified ? `
  <div style="background:#fffbeb;border:1.5px solid #fde68a;padding:8px 12px;border-radius:6px;margin-bottom:14px;font-size:10px;color:#92400e;">
    ⚠️ <strong>Catatan Verifikasi Spek:</strong> Spesifikasi sasaran mutu ini berstatus <strong>DRAFT</strong>. Uji lab aktual untuk kadar air (&lt;3.0%) dan asam lemak bebas/FFA (&lt;0.5%) sedang dalam proses sinkronisasi dengan hasil uji laboratorium fasilitas supplier mitra (${h(supplierName)}).
  </div>
  ` : `
  <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;padding:8px 12px;border-radius:6px;margin-bottom:14px;font-size:10px;color:#166534;">
    ✓ <strong>Terverifikasi:</strong> Parameter sasaran mutu dan skema pasokan dalam lembar data ini telah diverifikasi kesesuaiannya dengan mitra fasilitas pengolahan (${h(supplierName)}).
  </div>
  `}

  ${coaUrl ? `
  <div style="background:#f5f3ff;border:1.5px solid #ddd6fe;padding:8px 12px;border-radius:6px;margin-bottom:14px;font-size:10px;color:#581c87;">
    🧪 <strong>Laporan Hasil Uji (CoA) Laboratorium Tersedia:</strong> Dokumen Certificate of Analysis resmi dari mitra supplier (${h(supplierName)}) dapat diakses: <a href="${h(coaUrl)}" target="_blank" style="color:#6b21a8;font-weight:700;text-decoration:underline;">Lihat Berkas CoA Scan ↗</a>
  </div>
  ` : ''}

  <!-- 1. IDENTIFIKASI PRODUK -->
  <div class="section-title">1. Identifikasi Produk & Deskripsi</div>
  <div style="display:flex;gap:12px;align-items:stretch;margin-bottom:10px;">
    <table style="margin-bottom:0;flex:1;">
      <tr>
        <th style="width:26%;">Nama Komoditas</th>
        <td><strong>Bawang Merah Goreng Mutu Industri</strong> (Crispy Fried Shallots)</td>
      </tr>
      <tr>
        <th>Varietas / Asal</th>
        <td><em>Allium cepa var. aggregatum</em> (Varietas Asli Brebes & Sumenep Pilihan)</td>
      </tr>
      <tr>
        <th>HS Code</th>
        <td>2005.99.90 (Olahan Bawang / Prepared Vegetables)</td>
      </tr>
      <tr>
        <th>Deskripsi Pengolahan</th>
        <td>Bawang merah segar pilihan diiris seragam, digoreng dengan minyak kelapa sawit nabati berkualitas tinggi, dan ditiriskan secara maksimal melalui mesin sentrifugal kecepatan tinggi (centrifugal de-oiling) untuk menghasilkan kadar minyak bebas rendah dan kerenyahan tahan lama.</td>
      </tr>
    </table>
    ${
      photoDataUri
        ? `
    <div style="width:135px;flex-shrink:0;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;background:#f9fafb;display:flex;flex-direction:column;">
      <img src="${photoDataUri}" style="width:100%;height:105px;object-fit:cover;display:block;" alt="Bawang Merah Goreng Haturan" />
      <div style="font-size:9px;color:#4b5563;padding:4px;font-weight:600;text-align:center;background:#f3f4f6;border-top:1px solid #e5e7eb;">Foto Makro Flakes</div>
    </div>`
        : ''
    }
  </div>

  <!-- 2. PILIHAN VARIAN & GRADE -->
  <div class="section-title">2. Varian & Grade Industri</div>
  <div class="grid-2" style="margin-bottom:8px;">
    <div class="highlight-card">
      <div class="highlight-title">🧅 Grade A: Irisan Renyah Keemasan (Crispy Slice)</div>
      <div>Irisan utuh garing keemasan dengan aroma wangi khas alami. Sangat ideal untuk topping restoran, jaringan bakso/mie, katering korporat, dan taburan nasi box.</div>
    </div>
    <div class="highlight-card">
      <div class="highlight-title">🥣 Grade B: Giling Kasar (Coarse Ground)</div>
      <div>Tekstur giling kasar khusus untuk pencampur formulasi seasoning industri, racikan bumbu kaldu, pasta sambal kemasan, dan base savory premix.</div>
    </div>
  </div>

  <!-- 3. PARAMETER MUTU & SPESIFIKASI FISIK-KIMIA -->
  <div class="section-title">3. Parameter Mutu & Spesifikasi Fisik-Kimia</div>
  <table>
    <tr>
      <th>Parameter Uji</th>
      <th style="width:36%;">Standar Spesifikasi Haturan</th>
      <th>Metode / Keterangan</th>
    </tr>
    <tr>
      <td>Kadar Air (Moisture Content)</td>
      <td><strong>&lt; 3.0 %</strong></td>
      <td>Metode Gravimetri / Oven Pengeringan (Tahan Simpan)</td>
    </tr>
    <tr>
      <td>Asam Lemak Bebas (FFA as Oleic)</td>
      <td><strong>&lt; 0.50 %</strong></td>
      <td>Penirisan sentrifugal maksimal (Mencegah bau apek/tengik)</td>
    </tr>
    <tr>
      <td>Warna & Penampilan</td>
      <td>Kuning Keemasan Alami (Golden Brown)</td>
      <td>Visual Organoleptik (Tanpa Pewarna Sintetis)</td>
    </tr>
    <tr>
      <td>Aroma & Rasa</td>
      <td>Harum Gurih Khas Bawang Goreng Segar</td>
      <td>Bebas bau tengik, sangit, atau aroma bahan kimia asing</td>
    </tr>
    <tr>
      <td>Tekstur Kerenyahan</td>
      <td>Garing Renyah (Crispy & Dry)</td>
      <td>Sensorik (Renyah stabil saat disajikan)</td>
    </tr>
    <tr>
      <td>Minyak Penggorengan</td>
      <td>100% Minyak Kelapa Sawit Nabati Bermutu</td>
      <td>Tersertifikasi pangan halal & bermutu pangan</td>
    </tr>
    <tr>
      <td>Bahan Pengisi / Kimia Tambahan</td>
      <td><strong>NIL (100% Murni Bawang)</strong></td>
      <td>Bebas dari perisa sintetis, MSG tambahan, atau pengawet</td>
    </tr>
  </table>

  <!-- 4. PENGEMASAN & PENYIMPANAN -->
  <div class="section-title">4. Standar Pengemasan, Penyimpanan & Logistik</div>
  <table>
    <tr>
      <th>Kemasan Foodservice / HORECA</th>
      <td>Bal plastik ganda PE food-grade <strong>5 kg</strong> higienis, dikemas dalam master karton corrugated box 10–20 kg.</td>
    </tr>
    <tr>
      <th>Kemasan Industri / Bulk</th>
      <td>Karung anyam industri bulk <strong>20–25 kg</strong> dengan kantong dalam inner PE food-grade kedap udara.</td>
    </tr>
    <tr>
      <th>Masa Simpan (Shelf Life)</th>
      <td><strong>6 (Enam) Bulan</strong> dalam kemasan belum terbuka pada suhu ruang sejuk dan kering (&lt; 28°C, RH &lt; 70%).</td>
    </tr>
    <tr>
      <th>Skema Pengiriman</th>
      <td><strong>Franco Jabodetabek & Bandung</strong> (Pengiriman langsung ke fasilitas gudang / central kitchen buyer).</td>
    </tr>
    <tr>
      <th>Kapasitas Pasokan & Lead Time</th>
      <td>Kapasitas rutin 5–10 ton/bulan. Lead time: ±7 hari kerja (order baru 1–2 ton), ±3 hari kerja (repeat scheduled order).</td>
    </tr>
  </table>

  <!-- 5. STRUKTUR HARGA FRANCO RESMI -->
  <div class="section-title">5. Matriks Harga Resmi (Franco Jabodetabek / Bandung)</div>
  <table>
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="width:25%;">Volume Pesanan</th>
        <th style="width:30%;">Klasifikasi Buyer</th>
        <th style="width:25%;text-align:right;">Harga Satuan (Franco)</th>
        <th style="text-align:center;">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>100 – 499 kg</td>
        <td>Tier 1 (HORECA / Restoran Mandiri)</td>
        <td style="text-align:right;"><strong>Rp 165.000 / kg</strong></td>
        <td style="text-align:center;"><span class="badge-pill">Aktif</span></td>
      </tr>
      <tr>
        <td>500 – 999 kg</td>
        <td>Tier 2 (Katering Massal & Central Kitchen)</td>
        <td style="text-align:right;"><strong>Rp 155.000 / kg</strong></td>
        <td style="text-align:center;"><span class="badge-pill">Aktif</span></td>
      </tr>
      <tr>
        <td>1.000 – 2.000 kg (1–2 Ton)</td>
        <td>Tier 3 (Jaringan Resto Chain / Produsen Sambal)</td>
        <td style="text-align:right;"><strong>Rp 149.000 / kg</strong></td>
        <td style="text-align:center;"><span class="badge-pill">Aktif</span></td>
      </tr>
      <tr>
        <td>&gt; 2.000 kg (&gt; 2 Ton)</td>
        <td>Tier 4 (Manufaktur Seasoning & Pabrik Industri)</td>
        <td style="text-align:right;"><strong>Rp 144.000 / kg</strong></td>
        <td style="text-align:center;"><span class="badge-pill">Volume Contract</span></td>
      </tr>
    </tbody>
  </table>

  <!-- Footer & Signatory -->
  <div class="footer">
    <div style="font-size:9.5px;color:#6b7280;max-width:390px;line-height:1.4;">
      * Dokumen ini memuat spesifikasi sasaran mutu (Target Specification) komersial B2B PT Haturan Spice Indonesia. Pengolahan dilakukan pada fasilitas mitra yang menerapkan Sistem Jaminan Mutu Pangan dan minyak nabati bersertifikasi halal. Laporan Hasil Uji Laboratorium (CoA) per lot pengiriman dari lab terakreditasi KAN dapat disediakan berdasarkan kesepakatan kontrak pasokan industri. Sampel uji coba dapur (250–500 gram) tersedia untuk validasi tim QC/Chef sebelum penerbitan PO.
    </div>
    <div class="signature-box">
      <div class="signature-title">Hormat kami,</div>
      <div class="signatory-name">${h(signatory?.name || 'Agung Gunawan')}</div>
      <div style="font-size:10px;color:#4b5563;">${h(signatory?.title || 'Direktur')}</div>
      <div style="font-size:10px;color:#1a472a;font-weight:600;">${h(companyName)}</div>
    </div>
  </div>

  <script class="no-print">
    // Auto-trigger print dialog when accessed directly
    window.onload = function() {
      // Un-comment to auto-print: window.print();
    };
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
