import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { escapeHtml as h } from '@/lib/html'
import type { Buyer, CompanyProfile, PackingList, PackingListItem, Signatory } from '@/types'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Find invoice and packing list (id can be invoice_id or packing_list id)
  let packingList: PackingList | null = null
  let invoiceId = id

  const { data: plByInvoice } = await supabase
    .from('packing_lists')
    .select('*')
    .eq('invoice_id', id)
    .maybeSingle()

  if (plByInvoice) {
    packingList = plByInvoice as unknown as PackingList
  } else {
    const { data: plById } = await supabase
      .from('packing_lists')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (plById) {
      packingList = plById as unknown as PackingList
      invoiceId = plById.invoice_id
    }
  }

  const [{ data: inv }, { data: company }] = await Promise.all([
    supabase.from('invoices').select('*, buyers(*), signatories(*)').eq('id', invoiceId).single(),
    supabase.from('company_profile').select('*').limit(1).single(),
  ])

  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  let items: PackingListItem[] = []
  if (packingList) {
    const { data: plItems } = await supabase
      .from('packing_list_items')
      .select('*')
      .eq('packing_list_id', packingList.id)
      .order('sort_order')
    items = (plItems as unknown as PackingListItem[]) ?? []
  } else {
    // Auto-generate items fallback from invoice items if packing list hasn't been saved yet
    const { data: invItems } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order')

    items = (invItems ?? []).map((l, idx) => {
      const qty = l.quantity ?? 0
      const pkgs = Math.ceil(qty / 25) || 1 // assume 25kg jute bags default
      const netPerPkg = qty / pkgs
      const grossPerPkg = netPerPkg + 0.5 // +0.5kg tare bag weight
      return {
        id: l.id,
        packing_list_id: '',
        invoice_item_id: l.id,
        description: l.description,
        packages: pkgs,
        net_weight_per_package: netPerPkg,
        gross_weight_per_package: grossPerPkg,
        total_net_weight: qty,
        total_gross_weight: pkgs * grossPerPkg,
        sort_order: idx,
      }
    })
  }

  const buyer = inv.buyers as unknown as Buyer
  const signatory = inv.signatories as unknown as Signatory
  const co = company as unknown as CompanyProfile

  const fmtNum = (n: number | null) =>
    n !== null && n !== undefined ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n) : '—'

  const totalPkgs = packingList?.total_packages ?? items.reduce((s, i) => s + (i.packages ?? 0), 0)
  const totalNet = packingList?.total_net_weight ?? items.reduce((s, i) => s + (i.total_net_weight ?? 0), 0)
  const totalGross = packingList?.total_gross_weight ?? items.reduce((s, i) => s + (i.total_gross_weight ?? 0), 0)

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Packing List - ${inv.inv_number ?? 'Draft'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1a472a; }
  .co-name { font-size: 18px; font-weight: bold; color: #1a472a; }
  .co-info { font-size: 10px; color: #666; margin-top: 2px; }
  .doc-title { font-size: 26px; font-weight: bold; color: #1a472a; text-align: right; }
  .doc-meta { text-align: right; font-size: 11px; color: #555; margin-top: 3px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
  .party-label { font-size: 10px; font-weight: bold; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .shipment-info { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 11px; }
  .shipment-item label { font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase; display: block; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { text-align: left; padding: 7px 6px; font-size: 11px; font-weight: bold; color: #444; border-bottom: 2px solid #1a472a; background: #f4f6f3; }
  th.right { text-align: right; }
  td { padding: 8px 6px; font-size: 11px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
  td.right { text-align: right; }
  .total-row td { font-weight: bold; border-top: 2px solid #1a472a; background: #f9fafb; padding-top: 6px; }
  .signature { margin-top: 36px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="co-name">${h(co?.company_name ?? 'Haturan Trade')}</div>
    ${co?.address ? `<div class="co-info">${h(co.address)}</div>` : ''}
    ${co?.phone ? `<div class="co-info">Tel: ${h(co.phone)}</div>` : ''}
    ${co?.email ? `<div class="co-info">${h(co.email)}</div>` : ''}
    ${co?.npwp ? `<div class="co-info">NPWP: ${h(co.npwp)}</div>` : ''}
  </div>
  <div>
    <div class="doc-title">PACKING LIST</div>
    <div class="doc-meta">Ref Inv: ${h(inv.inv_number ?? '—')}</div>
    <div class="doc-meta">Date: ${h(inv.issue_date)}</div>
  </div>
</div>

<div class="parties">
  <div>
    <div class="party-label">Shipper / Exporter</div>
    <strong>${h(co?.company_name ?? 'Haturan Trade')}</strong>
    ${co?.address ? `<br>${h(co.address)}` : ''}
  </div>
  ${
    buyer
      ? `
  <div>
    <div class="party-label">Consignee / Buyer</div>
    <strong>${h(buyer.company_name)}</strong>
    ${buyer.contact_name ? `<br>Attn: ${h(buyer.contact_name)}` : ''}
    ${buyer.country ? `<br>${h(buyer.country)}` : ''}
  </div>`
      : ''
  }
</div>

<div class="shipment-info">
  <div class="shipment-item">
    <label>Vessel / Carrier</label>
    <span>${h(packingList?.vessel_name ?? 'To be advised')}</span>
  </div>
  <div class="shipment-item">
    <label>Port of Loading</label>
    <span>${h(packingList?.port_of_loading ?? 'Tanjung Priok, Indonesia')}</span>
  </div>
  <div class="shipment-item">
    <label>Port of Destination</label>
    <span>${h(packingList?.port_of_destination ?? 'To be advised')}</span>
  </div>
  <div class="shipment-item">
    <label>Container / Seal No.</label>
    <span>${packingList?.container_number ? `${h(packingList.container_number)} / ${h(packingList.seal_number ?? '-')}` : '—'}</span>
  </div>
</div>

${
  packingList?.shipping_marks
    ? `
<div style="margin-bottom:16px; font-size:11px;">
  <div style="font-size:10px; font-weight:bold; color:#888; text-transform:uppercase; margin-bottom:4px;">Shipping Marks & Numbers</div>
  <div style="font-family:monospace; background:#fafafa; border:1px solid #eee; padding:8px; border-radius:4px; white-space:pre-wrap;">${h(packingList.shipping_marks)}</div>
</div>`
    : ''
}

<table>
  <thead>
    <tr>
      <th>Description of Goods</th>
      <th class="right">No. of Pkgs</th>
      <th class="right">Net Wt / Pkg (kg)</th>
      <th class="right">Gross Wt / Pkg (kg)</th>
      <th class="right">Total Net Wt (kg)</th>
      <th class="right">Total Gross Wt (kg)</th>
    </tr>
  </thead>
  <tbody>
    ${items
      .map(
        (l) => `
    <tr>
      <td><strong>${h(l.description)}</strong></td>
      <td class="right">${fmtNum(l.packages)} Bag(s)</td>
      <td class="right">${fmtNum(l.net_weight_per_package)}</td>
      <td class="right">${fmtNum(l.gross_weight_per_package)}</td>
      <td class="right">${fmtNum(l.total_net_weight)}</td>
      <td class="right">${fmtNum(l.total_gross_weight)}</td>
    </tr>`
      )
      .join('')}
    <tr class="total-row">
      <td><strong>TOTAL</strong></td>
      <td class="right"><strong>${fmtNum(totalPkgs)} Bag(s)</strong></td>
      <td class="right">—</td>
      <td class="right">—</td>
      <td class="right"><strong>${fmtNum(totalNet)} kg</strong></td>
      <td class="right"><strong>${fmtNum(totalGross)} kg</strong></td>
    </tr>
  </tbody>
</table>

<div style="margin-top:24px; font-size:10px; color:#666; font-style:italic;">
  Summary: Total Net Weight: ${fmtNum(totalNet)} KGS | Total Gross Weight: ${fmtNum(totalGross)} KGS | Total Packages: ${fmtNum(totalPkgs)} JUTE BAG(S)
</div>

${
  signatory
    ? `
<div class="signature">
  <div style="font-size:10px; font-weight:bold; color:#888; text-transform:uppercase; margin-bottom:8px">Authorized Signature</div>
  ${signatory.signature_url && /^https?:\/\//i.test(signatory.signature_url) ? `<img src="${h(signatory.signature_url)}" style="height:44px;margin-bottom:4px">` : '<div style="height:44px"></div>'}
  <div><strong>${h(signatory.name)}</strong></div>
  <div style="color:#666;font-size:11px">${h(signatory.title ?? '')}</div>
  <div style="color:#666;font-size:11px">${h(co?.company_name ?? 'Haturan Trade')}</div>
</div>`
    : ''
}

<script>window.onload = () => window.print()</script>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
