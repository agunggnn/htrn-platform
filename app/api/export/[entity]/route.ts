import { createClient } from '@/lib/supabase/server'
import { convertToCSV } from '@/lib/export'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params
  const supabase = await createClient()

  // Ensure authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let csvContent = ''
  const filename = `export_${entity}_${new Date().toISOString().split('T')[0]}.csv`

  switch (entity) {
    case 'buyers': {
      const { data } = await supabase
        .from('buyers')
        .select('company_name, contact_name, email, phone, country, currency, payment_terms, source, is_active, created_at')
        .order('company_name')

      const formatted = (data ?? []).map((b) => ({
        ...b,
        is_active: b.is_active ? 'Aktif' : 'Nonaktif',
      }))

      csvContent = convertToCSV(formatted, [
        { key: 'company_name', label: 'Nama Perusahaan' },
        { key: 'contact_name', label: 'Nama Kontak' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Telepon' },
        { key: 'country', label: 'Negara' },
        { key: 'currency', label: 'Mata Uang' },
        { key: 'payment_terms', label: 'Syarat Pembayaran' },
        { key: 'source', label: 'Sumber Lead' },
        { key: 'is_active', label: 'Status' },
        { key: 'created_at', label: 'Tanggal Dibuat' },
      ])
      break
    }

    case 'invoices': {
      const { data } = await supabase
        .from('invoices')
        .select('inv_number, issue_date, due_date, currency, exchange_rate, status, subtotal, tax_amount, total_amount, amount_paid, amount_due, buyers(company_name)')
        .order('created_at', { ascending: false })

      const formatted = (data ?? []).map((i) => {
        const buyer = i.buyers as unknown as { company_name: string } | null
        return {
          inv_number: i.inv_number ?? 'Draft',
          company_name: buyer?.company_name ?? '—',
          issue_date: i.issue_date,
          due_date: i.due_date ?? '—',
          currency: i.currency,
          exchange_rate: i.exchange_rate,
          status: i.status,
          subtotal: i.subtotal ?? 0,
          tax_amount: i.tax_amount ?? 0,
          total_amount: i.total_amount ?? 0,
          amount_paid: i.amount_paid ?? 0,
          amount_due: i.amount_due ?? 0,
        }
      })

      csvContent = convertToCSV(formatted, [
        { key: 'inv_number', label: 'No. Invoice' },
        { key: 'company_name', label: 'Buyer' },
        { key: 'issue_date', label: 'Tanggal Terbit' },
        { key: 'due_date', label: 'Jatuh Tempo' },
        { key: 'currency', label: 'Mata Uang' },
        { key: 'exchange_rate', label: 'Kurs IDR' },
        { key: 'status', label: 'Status' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'tax_amount', label: 'Pajak' },
        { key: 'total_amount', label: 'Total Amount' },
        { key: 'amount_paid', label: 'Sudah Dibayar' },
        { key: 'amount_due', label: 'Sisa Pembayaran' },
      ])
      break
    }

    case 'quotations': {
      const { data } = await supabase
        .from('quotations')
        .select('quo_number, date, valid_until, currency, status, total_amount, buyers(company_name)')
        .order('created_at', { ascending: false })

      const formatted = (data ?? []).map((q) => {
        const buyer = q.buyers as unknown as { company_name: string } | null
        return {
          quo_number: q.quo_number ?? 'Draft',
          company_name: buyer?.company_name ?? '—',
          date: q.date,
          valid_until: q.valid_until ?? '—',
          currency: q.currency,
          status: q.status,
          total_amount: q.total_amount ?? 0,
        }
      })

      csvContent = convertToCSV(formatted, [
        { key: 'quo_number', label: 'No. Quotation' },
        { key: 'company_name', label: 'Buyer' },
        { key: 'date', label: 'Tanggal' },
        { key: 'valid_until', label: 'Berlaku Sampai' },
        { key: 'currency', label: 'Mata Uang' },
        { key: 'status', label: 'Status' },
        { key: 'total_amount', label: 'Total Amount' },
      ])
      break
    }

    case 'purchase-orders': {
      const { data } = await supabase
        .from('purchase_orders')
        .select('po_number, order_date, expected_date, received_date, status, total_amount, suppliers(name)')
        .order('created_at', { ascending: false })

      const formatted = (data ?? []).map((po) => {
        const supplier = po.suppliers as unknown as { name: string } | null
        return {
          po_number: po.po_number ?? 'Draft',
          supplier_name: supplier?.name ?? '—',
          order_date: po.order_date,
          expected_date: po.expected_date ?? '—',
          received_date: po.received_date ?? '—',
          status: po.status,
          total_amount: po.total_amount ?? 0,
        }
      })

      csvContent = convertToCSV(formatted, [
        { key: 'po_number', label: 'No. PO' },
        { key: 'supplier_name', label: 'Supplier' },
        { key: 'order_date', label: 'Tanggal Pesan' },
        { key: 'expected_date', label: 'Estimasi Tiba' },
        { key: 'received_date', label: 'Tanggal Diterima' },
        { key: 'status', label: 'Status' },
        { key: 'total_amount', label: 'Total Amount' },
      ])
      break
    }

    case 'prices': {
      const { data } = await supabase
        .from('price_history')
        .select('price_date, grade_code, price_per_unit, currency, source_type, items(name)')
        .order('price_date', { ascending: false })

      const formatted = (data ?? []).map((p) => {
        const item = p.items as unknown as { name: string } | null
        return {
          price_date: p.price_date,
          item_name: item?.name ?? '—',
          grade_code: p.grade_code,
          price_per_unit: p.price_per_unit,
          currency: p.currency,
          source_type: p.source_type ?? 'market',
        }
      })

      csvContent = convertToCSV(formatted, [
        { key: 'price_date', label: 'Tanggal' },
        { key: 'item_name', label: 'Komoditas' },
        { key: 'grade_code', label: 'Grade' },
        { key: 'price_per_unit', label: 'Harga per Unit' },
        { key: 'currency', label: 'Mata Uang' },
        { key: 'source_type', label: 'Sumber' },
      ])
      break
    }

    default:
      return NextResponse.json({ error: 'Entity not supported' }, { status: 400 })
  }

  return new Response('\uFEFF' + csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
