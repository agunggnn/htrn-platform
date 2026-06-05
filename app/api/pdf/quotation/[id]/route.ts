import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Simple HTML-to-PDF approach using browser print styles
// @react-pdf/renderer excluded from edge runtime; use HTML response for now
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: quo }, { data: lineItems }, { data: company }, { data: banks }] = await Promise.all([
    supabase.from('quotations').select('*, buyers(*), signatories(*)').eq('id', id).single(),
    supabase.from('quotation_items').select('*, items(name, name_en)').eq('quotation_id', id).order('sort_order'),
    supabase.from('company_profile').select('*').limit(1).single(),
    supabase.from('bank_accounts').select('*').eq('is_primary', true).limit(1).single(),
  ])

  if (!quo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buyer = quo.buyers as any
  const signatory = quo.signatories as any
  const isID = quo.language === 'id'

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: quo.currency, minimumFractionDigits: 2 }).format(n)

  const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n)

  const T = isID
    ? { title: 'PENAWARAN HARGA', to: 'Kepada Yth.', desc: 'Deskripsi', grade: 'Grade', qty: 'Jumlah', unit: 'Satuan', price: 'Harga Satuan', sub: 'Subtotal', subtotal: 'Subtotal', tax: 'Pajak', total: 'TOTAL', terms: 'Syarat Pembayaran', notes: 'Catatan', validity: 'Berlaku sampai', origin: 'Negara Asal', authorized: 'Hormat kami' }
    : { title: 'QUOTATION', to: 'To', desc: 'Description', grade: 'Grade', qty: 'Qty', unit: 'Unit', price: 'Unit Price', sub: 'Subtotal', subtotal: 'Subtotal', tax: 'Tax', total: 'TOTAL', terms: 'Payment Terms', notes: 'Notes', validity: 'Valid until', origin: 'Origin', authorized: 'Authorized by' }

  const companyName = (company as any)?.company_name ?? 'Haturan'
  const address = (company as any)?.address ?? ''
  const phone = (company as any)?.phone ?? ''
  const email = (company as any)?.email ?? ''
  const npwp = (company as any)?.npwp ?? ''

  const lines = lineItems ?? []

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${quo.quo_number ?? 'Quotation'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #1a472a; }
  .company-name { font-size: 20px; font-weight: bold; color: #1a472a; }
  .company-sub { font-size: 11px; color: #666; margin-top: 2px; }
  .doc-title { font-size: 28px; font-weight: bold; color: #1a472a; text-align: right; }
  .doc-meta { text-align: right; font-size: 11px; color: #555; margin-top: 4px; }
  .section { margin-bottom: 20px; }
  .section-label { font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { text-align: left; padding: 8px 6px; font-size: 11px; font-weight: bold; color: #444; border-bottom: 2px solid #1a472a; }
  th.right { text-align: right; }
  td { padding: 7px 6px; font-size: 11px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  td.right { text-align: right; }
  .total-section { display: flex; justify-content: flex-end; margin: 8px 0 20px; }
  .total-table { width: 220px; }
  .total-table td { border: none; padding: 3px 6px; }
  .total-row td { font-weight: bold; border-top: 2px solid #1a472a; padding-top: 6px; }
  .footer-note { font-size: 10px; color: #888; margin-top: 4px; }
  .signature { margin-top: 32px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="company-name">${companyName}</div>
    ${address ? `<div class="company-sub">${address}</div>` : ''}
    ${phone ? `<div class="company-sub">Tel: ${phone}</div>` : ''}
    ${email ? `<div class="company-sub">${email}</div>` : ''}
    ${npwp ? `<div class="company-sub">NPWP: ${npwp}</div>` : ''}
  </div>
  <div>
    <div class="doc-title">${T.title}</div>
    <div class="doc-meta">No: ${quo.quo_number ?? '—'}</div>
    <div class="doc-meta">Date: ${quo.date}</div>
    <div class="doc-meta">${T.validity}: ${quo.valid_until ?? '—'}</div>
  </div>
</div>

${buyer ? `
<div class="section">
  <div class="section-label">${T.to}</div>
  <strong>${buyer.company_name}</strong><br>
  ${buyer.contact_name ? `Attn: ${buyer.contact_name}<br>` : ''}
  ${buyer.country ?? ''}<br>
  ${buyer.email ?? ''}
</div>` : ''}

<table>
  <thead>
    <tr>
      <th>${T.desc}</th>
      <th>${T.grade}</th>
      <th style="text-align:right">${T.qty} (${lines[0]?.unit ?? 'kg'})</th>
      <th style="text-align:right">${T.price} (${quo.currency})</th>
      <th style="text-align:right">${T.sub} (${quo.currency})</th>
    </tr>
  </thead>
  <tbody>
    ${lines.map((l: any) => `
    <tr>
      <td>
        <strong>${isID ? l.items?.name : (l.items?.name_en ?? l.items?.name)}</strong>
        ${l.hs_code ? `<br><span style="color:#888;font-size:10px">HS Code: ${l.hs_code} · ${l.country_of_origin}</span>` : ''}
      </td>
      <td>${l.grade_code}</td>
      <td class="right">${fmtNum(l.quantity)}</td>
      <td class="right">${fmtNum(l.unit_price)}</td>
      <td class="right">${fmtNum(l.subtotal)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="total-section">
  <table class="total-table">
    <tr><td>${T.subtotal}</td><td style="text-align:right">${fmt(quo.subtotal ?? 0)}</td></tr>
    ${quo.tax_rate > 0 ? `<tr><td>${T.tax} (${quo.tax_rate}%)</td><td style="text-align:right">${fmt(quo.tax_amount ?? 0)}</td></tr>` : ''}
    <tr class="total-row"><td>${T.total}</td><td style="text-align:right"><strong>${fmt(quo.total_amount ?? 0)}</strong></td></tr>
  </table>
</div>

${quo.payment_terms ? `
<div class="section">
  <div class="section-label">${T.terms}</div>
  <div>${quo.payment_terms}</div>
</div>` : ''}

${(banks as any)?.bank_name ? `
<div class="section">
  <div class="section-label">Bank Transfer</div>
  <div>${(banks as any).bank_name} · ${(banks as any).account_number} · ${(banks as any).account_name}</div>
</div>` : ''}

${quo.notes ? `
<div class="section">
  <div class="section-label">${T.notes}</div>
  <div>${quo.notes}</div>
</div>` : ''}

<div class="footer-note">This ${isID ? 'quotation' : 'quotation'} is valid until ${quo.valid_until ?? '—'}.</div>

${signatory ? `
<div class="signature">
  <div class="section-label" style="margin-bottom:8px">${T.authorized}</div>
  ${signatory.signature_url ? `<img src="${signatory.signature_url}" style="height:48px;margin-bottom:4px">` : '<div style="height:48px"></div>'}
  <div><strong>${signatory.name}</strong></div>
  <div style="color:#666;font-size:11px">${signatory.title ?? ''}</div>
  <div style="color:#666;font-size:11px">${companyName}</div>
</div>` : ''}

<script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
