import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: inv }, { data: lines }, { data: company }, { data: bank }] = await Promise.all([
    supabase.from('invoices').select('*, buyers(*), signatories(*)').eq('id', id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order'),
    supabase.from('company_profile').select('*').limit(1).single(),
    supabase.from('bank_accounts').select('*').eq('is_primary', true).limit(1).single(),
  ])

  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buyer = inv.buyers as any
  const signatory = inv.signatories as any
  const co = company as any
  const bk = bank as any
  const isID = inv.language === 'id'

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: inv.currency, minimumFractionDigits: 2 }).format(n)
  const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n)

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${inv.inv_number ?? 'Invoice'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #1a472a; }
  .co-name { font-size: 18px; font-weight: bold; color: #1a472a; }
  .co-info { font-size: 10px; color: #666; margin-top: 2px; }
  .doc-title { font-size: 26px; font-weight: bold; color: #1a472a; text-align: right; }
  .doc-meta { text-align: right; font-size: 11px; color: #555; margin-top: 3px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
  .party-label { font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { text-align: left; padding: 7px 6px; font-size: 11px; font-weight: bold; color: #444; border-bottom: 2px solid #1a472a; }
  th.right { text-align: right; }
  td { padding: 7px 6px; font-size: 11px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  td.right { text-align: right; }
  .totals { display: flex; justify-content: flex-end; margin: 6px 0 18px; }
  .totals table { width: 220px; }
  .totals td { border: none; padding: 2px 6px; }
  .total-final td { font-weight: bold; border-top: 2px solid #1a472a; padding-top: 5px; }
  .section-label { font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .declaration { font-size: 10px; color: #888; font-style: italic; margin-top: 12px; }
  .signature { margin-top: 28px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="co-name">${co?.company_name ?? 'Haturan'}</div>
    ${co?.address ? `<div class="co-info">${co.address}</div>` : ''}
    ${co?.phone ? `<div class="co-info">Tel: ${co.phone}</div>` : ''}
    ${co?.email ? `<div class="co-info">${co.email}</div>` : ''}
    ${co?.npwp ? `<div class="co-info">NPWP: ${co.npwp}</div>` : ''}
  </div>
  <div>
    <div class="doc-title">${isID ? 'INVOICE' : 'COMMERCIAL INVOICE'}</div>
    <div class="doc-meta">No: ${inv.inv_number ?? '—'}</div>
    <div class="doc-meta">Date: ${inv.issue_date}</div>
    <div class="doc-meta">Due: ${inv.due_date ?? '—'}</div>
  </div>
</div>

<div class="parties">
  <div>
    <div class="party-label">Shipper / Exporter</div>
    <strong>${co?.company_name ?? 'Haturan'}</strong>
    ${co?.npwp ? `<br><span style="font-size:10px;color:#666">NPWP: ${co.npwp}</span>` : ''}
  </div>
  ${buyer ? `
  <div>
    <div class="party-label">Consignee / Buyer</div>
    <strong>${buyer.company_name}</strong>
    ${buyer.contact_name ? `<br>Attn: ${buyer.contact_name}` : ''}
    ${buyer.country ? `<br>${buyer.country}` : ''}
    ${buyer.email ? `<br>${buyer.email}` : ''}
  </div>` : ''}
</div>

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th>Grade</th>
      <th>HS Code</th>
      <th>Origin</th>
      <th class="right">Qty (kg)</th>
      <th class="right">Unit Price (${inv.currency})</th>
      <th class="right">Amount (${inv.currency})</th>
    </tr>
  </thead>
  <tbody>
    ${(lines ?? []).map((l: any) => `
    <tr>
      <td><strong>${l.description}</strong></td>
      <td>${l.grade_code ?? '—'}</td>
      <td>${l.hs_code ?? '—'}</td>
      <td>${l.country_of_origin ?? 'Indonesia'}</td>
      <td class="right">${fmtNum(l.quantity)}</td>
      <td class="right">${fmtNum(l.unit_price)}</td>
      <td class="right">${fmtNum(l.subtotal)}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="totals">
  <table>
    <tr><td>Subtotal</td><td class="right">${fmt(inv.subtotal ?? 0)}</td></tr>
    ${inv.tax_rate > 0 ? `<tr><td>Tax (${inv.tax_rate}%)</td><td class="right">${fmt(inv.tax_amount ?? 0)}</td></tr>` : ''}
    ${inv.currency !== 'IDR' && inv.exchange_rate > 1 ? `<tr><td style="font-size:10px;color:#888">${inv.currency} 1 = IDR ${new Intl.NumberFormat('id-ID').format(inv.exchange_rate)}</td><td class="right" style="font-size:10px;color:#888">Rp ${new Intl.NumberFormat('id-ID').format(Math.round((inv.total_amount ?? 0) * inv.exchange_rate))}</td></tr>` : ''}
    <tr class="total-final"><td><strong>TOTAL (${inv.currency})</strong></td><td class="right"><strong>${fmt(inv.total_amount ?? 0)}</strong></td></tr>
  </table>
</div>

${bk?.bank_name ? `
<div style="margin-bottom:12px">
  <div class="section-label">Payment Instructions</div>
  <div>${bk.bank_name} &nbsp;|&nbsp; Account: ${bk.account_number} &nbsp;|&nbsp; ${bk.account_name}</div>
</div>` : ''}

${inv.payment_terms ? `
<div style="margin-bottom:12px">
  <div class="section-label">Payment Terms</div>
  <div>${inv.payment_terms}</div>
</div>` : ''}

${inv.notes ? `
<div style="margin-bottom:12px">
  <div class="section-label">Notes</div>
  <div>${inv.notes}</div>
</div>` : ''}

<div class="declaration">
  I hereby certify that the information in this invoice is true and correct to the best of my knowledge.
</div>

${signatory ? `
<div class="signature">
  <div class="section-label" style="margin-bottom:8px">Authorized Signature</div>
  ${signatory.signature_url ? `<img src="${signatory.signature_url}" style="height:44px;margin-bottom:4px">` : '<div style="height:44px"></div>'}
  <div><strong>${signatory.name}</strong></div>
  <div style="color:#666;font-size:11px">${signatory.title ?? ''}</div>
  <div style="color:#666;font-size:11px">${co?.company_name ?? 'Haturan'}</div>
</div>` : ''}

<script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
