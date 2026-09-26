import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtml as h } from '@/lib/html'
import { requireUser } from '@/lib/api-auth'
import type { CompanyProfile, Signatory } from '@/types'

export async function GET() {
  const supabase = await createClient()

  const [{ data: company }, { data: signatoryData }, { data: claimDocData }] = await Promise.all([
    supabase.from('company_profile').select('*').limit(1).maybeSingle(),
    supabase.from('signatories').select('*').eq('is_default', true).limit(1).maybeSingle(),
    supabase
      .from('claim_documents')
      .select('*, suppliers(id, name, region)')
      .eq('doc_type', 'halal_declaration')
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
    <h2>Dokumen Belum Terverifikasi</h2>
    <p>Surat Jaminan Kehalalan & Keamanan Pangan saat ini masih dalam proses audit verifikasi fisik bersama mitra supplier atau akses publik dinonaktifkan. Dokumen hanya dapat diakses setelah diverifikasi secara sah.</p>
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
  // Use gated file route instead of exposing raw storage URL directly
  const supportingUrl = claimDoc?.supporting_file_url && claimDoc?.id
    ? `/api/claim-documents/${claimDoc.id}/file`
    : null

  const companyProfile = company as unknown as CompanyProfile
  const signatory = signatoryData as unknown as Signatory

  const companyName = companyProfile?.company_name || 'PT Haturan Spice Indonesia'
  const email = companyProfile?.email || 'commercial@haturan.com'
  const website = companyProfile?.website || 'https://haturan.com'
  const signatoryName = signatory?.name || 'Agung Gunawan'
  const signatoryTitle = signatory?.title || 'Direktur'
  const todayWib = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(new Date())

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Surat Pernyataan Jaminan Kehalalan & Keamanan Pangan - PT Haturan Spice Indonesia</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
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
      margin-bottom: 20px;
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
      font-size: 13px;
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
    .title-block {
      text-align: center;
      margin-bottom: 20px;
    }
    .title-main {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      color: #111827;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .title-sub {
      font-size: 11px;
      font-weight: 600;
      color: #1a472a;
      font-style: italic;
    }
    .number-box {
      font-size: 10px;
      color: #6b7280;
      margin-top: 4px;
    }
    .statement-box {
      background: #fafafa;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .points-list {
      margin: 0;
      padding-left: 20px;
    }
    .points-list li {
      margin-bottom: 10px;
      text-align: justify;
    }
    .highlight-card {
      background: #f0fdf4;
      border-left: 4px solid #1a472a;
      padding: 10px 14px;
      margin: 16px 0;
      font-size: 10.5px;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
      padding-top: 10px;
    }
    .no-print {
      margin-bottom: 15px;
      padding: 8px 12px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      font-size: 11px;
      color: #065f46;
      display: flex;
      justify-content: space-between;
      align-items: center;
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
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${!isVerified ? `<div class="draft-watermark">DRAFT — BELUM TERVERIFIKASI FISIK</div>` : ''}

  <div class="no-print">
    <span>Dokumen resmi siap cetak (A4) ber-kop surat PT Haturan Spice Indonesia.</span>
    <button onclick="window.print()" style="background:#1a472a;color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
      Cetak / Simpan PDF
    </button>
  </div>

  <!-- HEADER / KOP SURAT -->
  <div class="header">
    <div>
      <div class="company-title">${h(companyName)}</div>
      <div class="company-sub">
        Divisi Perdagangan Komoditas & Pasokan Pangan Industri<br>
        Email: ${h(email)} | Web: ${h(website)} | Republik Indonesia
      </div>
    </div>
    <div class="doc-badge">
      <div class="doc-type">Jaminan Mutu & Halal</div>
      <div class="doc-meta" style="${!isVerified ? 'color:#b45309;font-weight:700;' : ''}">Status: ${isVerified ? `Terverifikasi Mitra (${h(supplierName)})` : 'DRAFT (Belum Terverifikasi Supplier)'}</div>
      <div class="doc-meta">Tanggal: ${h(todayWib)}</div>
    </div>
  </div>

  <!-- TITLE -->
  <div class="title-block">
    <div class="title-main">SURAT PERNYATAAN JAMINAN KEHALALAN & KEAMANAN PANGAN</div>
    <div class="title-sub">(Product Halal & Food-Safety Assurance Declaration)</div>
    <div class="number-box">Nomor: HTRN/DECL-HALAL/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/01</div>
  </div>

  ${!isVerified ? `
  <div style="background:#fffbeb;border:1.5px solid #fde68a;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-size:10.5px;color:#92400e;">
    ⚠️ <strong>Catatan Verifikasi:</strong> Dokumen ini berstatus <strong>DRAFT</strong>. Klaim jaminan kehalalan bahan nabati dan sertifikasi minyak kelapa sawit saat ini dalam tahap verifikasi kesesuaian fisik dengan fasilitas mitra pengolahan (${h(supplierName)}).
  </div>
  ` : `
  <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-size:10.5px;color:#166534;">
    ✓ <strong>Terverifikasi:</strong> Komitmen mutu dan jaminan kehalalan dalam surat ini telah diverifikasi kesesuaiannya dengan mitra fasilitas pengolahan (${h(supplierName)}).
  </div>
  `}

  ${supportingUrl ? `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:8px 12px;border-radius:6px;margin-bottom:16px;font-size:10.5px;color:#334155;">
    📎 <strong>Bukti Fisik Resmi Terlampir:</strong> Scan dokumen bukti resmi dari supplier (${h(supplierName)}) telah diarsipkan: <a href="${h(supportingUrl)}" target="_blank" style="color:#1a472a;font-weight:700;text-decoration:underline;">Buka Berkas Bukti Scan ↗</a>
  </div>
  ` : ''}

  <!-- STATEMENT BODY -->
  <p>
    Yang bertanda tangan di bawah ini:
  </p>

  <div class="statement-box">
    <table style="width:100%;font-size:11px;border-collapse:collapse;">
      <tr>
        <td style="width:140px;font-weight:600;padding:2px 0;">Nama Lengkap</td>
        <td style="width:10px;">:</td>
        <td style="font-weight:bold;">${h(signatoryName)}</td>
      </tr>
      <tr>
        <td style="font-weight:600;padding:2px 0;">Jabatan</td>
        <td>:</td>
        <td>${h(signatoryTitle)}</td>
      </tr>
      <tr>
        <td style="font-weight:600;padding:2px 0;">Badan Usaha</td>
        <td>:</td>
        <td>${h(companyName)}</td>
      </tr>
      <tr>
        <td style="font-weight:600;padding:2px 0;">Komoditas Pasokan</td>
        <td>:</td>
        <td><strong>Bawang Merah Goreng Industri (Fried Shallots) - Varietas Brebes & Sumenep Super</strong></td>
      </tr>
    </table>
  </div>

  <p>
    Dengan ini menerangkan dan menjamin dengan sebenar-benarnya kepada seluruh Mitra Pembeli Korporat, Hotel, Restoran, Katering Massal (HORECA), dan Pabrik Pengolahan Pangan Industri bahwa:
  </p>

  <ol class="points-list">
    <li>
      <strong>Komposisi 100% Bahan Nabati Alami (Pure Plant-Based):</strong> Seluruh produk Bawang Merah Goreng yang dipasok oleh PT Haturan Spice Indonesia diproduksi murni dari umbi Bawang Merah varietas Brebes dan Sumenep asli, tanpa penambahan bahan pengisi umbi asing atau zat kimia pengembang sintetis.
    </li>
    <li>
      <strong>Komitmen Pemilihan Minyak Goreng Nabati Bersertifikasi:</strong> Standar pengadaan mewajibkan mitra pengolahan hanya menggunakan 100% Minyak Kelapa Sawit (RBD Palm Olein) bermerek komersial/industri yang terdaftar memiliki izin edar BPOM dan sertifikat Halal resmi dari produsen minyak terkait.
    </li>
    <li>
      <strong>Komitmen Bebas Kontaminasi Silang Najis & Unsur Haram:</strong> Mitra pengolahan diseleksi berdasarkan standar kelayakan sanitasi pangan nabati. Lini penggorengan difokuskan murni untuk komoditas hortikultura nabati, tanpa mencampur atau memproses bahan hewani turunan babi (*porcine*), alkohol industri, maupun bahan penolong najis lainnya.
    </li>
    <li>
      <strong>Bebas Pengawet Berbahaya & Bahan Tambahan Non-Pangan:</strong> Produk dijamin bebas dari formalin, boraks, pemutih, perenyah non-pangan, maupun bahan pewarna kimia buatan. Kerenyahan dan daya tahan produk murni dicapai melalui teknologi penirisan minyak sentrifugal otomatis (*centrifugal de-oiling*) dengan target kadar air &lt; 3.0%.
    </li>
    <li>
      <strong>Standar Kemasan Bersih & Keamanan Distribusi (Food-Grade Packaging):</strong> Produk dikemas dalam kantong plastik ganda PE (*Polyethylene Food-Grade*) higienis kedap udara yang dilindungi oleh master corrugated carton box tebal, menjamin proteksi terhadap kelembapan dan cemaran fisik selama transportasi.
    </li>
    <li>
      <strong>Verifikasi Pengujian Laboratorium Independen (CoA on Demand):</strong> Untuk pesanan kontrak pasokan industri berkala, PT Haturan Spice Indonesia berkomitmen menyediakan Laporan Hasil Uji (LHU) / Certificate of Analysis (CoA) dari laboratorium pangan independen terakreditasi KAN (Komite Akreditasi Nasional) sesuai spesifikasi parameter mutu yang disepakati.
    </li>
  </ol>

    <div class="highlight-card">
      <strong>Pernyataan Kualifikasi Supplier:</strong> Surat pernyataan ini diterbitkan dengan itikad baik sebagai rangkuman spesifikasi dan komitmen mutu rantai pasok (*supply chain standard*) PT Haturan Spice Indonesia. Dokumen ini dimaksudkan untuk melengkapi berkas kualifikasi vendor awal dan dapat ditindaklanjuti dengan audit fasilitas atau pengujian sampel laboratorium atas kesepakatan bersama. Ruang lingkup dokumen ini adalah jaminan kehalalan dan keamanan pangan, bukan pernyataan izin edar BPOM.
    </div>

  <p style="margin-top:15px;">
    Demikian surat pernyataan jaminan kehalalan dan keamanan pangan ini dibuat dengan itikad baik untuk dipergunakan sebagaimana mestinya.
  </p>

  <!-- SIGNATURE -->
  <div class="signature-grid">
    <div style="font-size:10px;color:#6b7280;max-width:320px;">
      Dokumen digital resmi PT Haturan Spice Indonesia.<br>
      Keabsahan dapat dikonfirmasi via email ke ${h(email)}.
    </div>
    <div style="text-align:right;">
      <div style="font-size:10px;color:#4b5563;margin-bottom:4px;">Jakarta, ${h(todayWib)}</div>
      <div style="font-size:11px;font-weight:700;color:#111827;">${h(companyName)}</div>
      <div style="height:45px;"></div>
      <div style="font-size:12px;font-weight:800;color:#1a472a;text-decoration:underline;">${h(signatoryName)}</div>
      <div style="font-size:10px;color:#4b5563;">${h(signatoryTitle)}</div>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
