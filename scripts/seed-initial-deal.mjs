import fs from 'fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

async function run() {
  const env = dotenv.parse(fs.readFileSync('.env.local'))
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // 1. Fetch buyer Bakso Boedjangan
  const { data: buyer, error: buyerErr } = await supabase
    .from('buyers')
    .select('id, company_name, contact_name, phone, email')
    .ilike('company_name', '%Bakso Boedjangan%')
    .maybeSingle()

  if (buyerErr || !buyer) {
    console.error('Buyer Bakso Boedjangan not found:', buyerErr)
    return
  }
  console.log('Target Buyer:', buyer.company_name, 'ID:', buyer.id)

  // 2. Fetch Bawang Merah Goreng item
  const { data: item, error: itemErr } = await supabase
    .from('items')
    .select('id, name, unit')
    .ilike('name', '%Bawang Merah Goreng%')
    .maybeSingle()

  if (itemErr || !item) {
    console.error('Item Bawang Merah Goreng not found:', itemErr)
    return
  }
  console.log('Target Item:', item.name, 'ID:', item.id)

  // 3. Fetch default signatory
  const { data: signatory } = await supabase
    .from('signatories')
    .select('id, name, title')
    .eq('is_default', true)
    .maybeSingle()

  console.log('Default Signatory:', signatory?.name, 'Title:', signatory?.title)

  // 4. Fetch primary bank account
  const { data: bank } = await supabase
    .from('bank_accounts')
    .select('id, bank_name, account_number, account_name')
    .eq('is_primary', true)
    .maybeSingle()

  console.log('Primary Bank:', bank?.bank_name, 'No:', bank?.account_number)

  // 5. Create or retrieve Quotation QUO/2026/09/001
  const quoNumber = 'QUO/2026/09/001'
  let quoId = null

  const { data: existingQuo } = await supabase
    .from('quotations')
    .select('id')
    .eq('quo_number', quoNumber)
    .maybeSingle()

  if (existingQuo) {
    quoId = existingQuo.id
    console.log('Existing Quotation found:', quoId)
  } else {
    const today = new Date().toISOString().split('T')[0]
    const validUntil = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

    const { data: newQuo, error: quoErr } = await supabase
      .from('quotations')
      .insert({
        quo_number: quoNumber,
        buyer_id: buyer.id,
        signatory_id: signatory?.id,
        date: today,
        valid_until: validUntil,
        currency: 'IDR',
        language: 'id',
        status: 'sent',
        subtotal: 77500000,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: 77500000,
        payment_terms: 'CBD (Cash Before Delivery)',
        notes: 'Harga sudah termasuk ongkos kirim (Franco Bandung/Jabodetabek), pengemasan 100 bal @ 5 kg (25 master box karton tebal), dan garansi mutu 100% ganti baru.',
        internal_notes: 'Fulfillment via CV Daun Mas (Mas Parmin Hub Bogor). HPP Modal Rp 125.000/kg. Proyeksi laba kotor: Rp 14.350.000.',
      })
      .select('id')
      .single()

    if (quoErr) {
      console.error('Error creating quotation:', quoErr)
      return
    }
    quoId = newQuo.id
    console.log('New Quotation created:', quoId)

    // Insert Quotation Item (500 kg @ Rp 155.000)
    const { error: itemInsertErr } = await supabase.from('quotation_items').insert({
      quotation_id: quoId,
      item_id: item.id,
      grade_code: 'GRADE_A_SLICE',
      quantity: 500,
      unit: 'kg',
      unit_price: 155000,
      subtotal: 77500000,
      hs_code: '2005.99.90',
      country_of_origin: 'Indonesia',
      sort_order: 1,
    })

    if (itemInsertErr) {
      console.error('Error creating quotation item:', itemInsertErr)
      return
    }
    console.log('Quotation Item (500 kg @ Rp 155.000) created successfully!')
  }

  // 6. Create or retrieve Invoice INV/2026/09/001
  const invNumber = 'INV/2026/09/001'
  let invId = null

  const { data: existingInv } = await supabase
    .from('invoices')
    .select('id')
    .eq('inv_number', invNumber)
    .maybeSingle()

  if (existingInv) {
    invId = existingInv.id
    console.log('Existing Invoice found:', invId)
  } else {
    const today = new Date().toISOString().split('T')[0]
    const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

    const { data: newInv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        inv_number: invNumber,
        quotation_id: quoId,
        buyer_id: buyer.id,
        signatory_id: signatory?.id,
        issue_date: today,
        due_date: dueDate,
        currency: 'IDR',
        exchange_rate: 1,
        language: 'id',
        status: 'sent',
        subtotal: 77500000,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: 77500000,
        amount_paid: 0,
        amount_due: 77500000,
        payment_terms: 'CBD (Cash Before Delivery)',
        notes: 'Pembayaran transfer penuh sebelum armada Mas Parmin diberangkatkan dari Hub Bogor.',
      })
      .select('id')
      .single()

    if (invErr) {
      console.error('Error creating invoice:', invErr)
      return
    }
    invId = newInv.id
    console.log('New Invoice created:', invId)

    // Insert Invoice Item
    const { error: invItemErr } = await supabase.from('invoice_items').insert({
      invoice_id: invId,
      item_id: item.id,
      quantity: 500,
      unit: 'kg',
      unit_price: 155000,
      subtotal: 77500000,
      sort_order: 1,
    })

    if (invItemErr) {
      console.error('Error creating invoice item:', invItemErr)
      return
    }
    console.log('Invoice Item (500 kg @ Rp 155.000) created successfully!')
  }

  console.log('\n--- RINGKASAN DATA DEAL RESMI ---')
  console.log('Quotation ID:', quoId, '-> http://localhost:3000/quotations/' + quoId)
  console.log('Invoice ID:', invId, '-> http://localhost:3000/invoices/' + invId)
  console.log('Quotation PDF:', 'http://localhost:3000/api/pdf/quotation/' + quoId)
  console.log('Invoice PDF:', 'http://localhost:3000/api/pdf/invoice/' + invId)
  console.log('Surat Jalan PDF:', 'http://localhost:3000/api/pdf/surat-jalan/' + quoId)
}

run().catch(console.error)
