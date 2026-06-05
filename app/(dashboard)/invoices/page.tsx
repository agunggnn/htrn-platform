import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  partial: 'bg-yellow-50 text-yellow-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-600',
}

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, buyers(company_name, country)')
    .order('created_at', { ascending: false })

  const list = invoices ?? []

  const fmt = (n: number, cur = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

  const totalOutstanding = list
    .filter((i) => ['sent', 'partial', 'overdue'].includes(i.status))
    .reduce((s, i) => s + (i.amount_due ?? 0), 0)
  const overdueCount = list.filter((i) => i.status === 'overdue').length
  const paidThisMonth = list
    .filter((i) => i.status === 'paid' && i.issue_date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, i) => s + (i.total_amount ?? 0), 0)

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
          <p className="text-sm text-gray-500 mt-0.5">{list.length} invoice</p>
        </div>
        <div className="flex gap-2">
          <Link href="/invoices/aging"
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Aging Report
          </Link>
          <Link href="/invoices/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
            style={{ backgroundColor: '#1a472a' }}>
            <Plus className="w-4 h-4" /> Invoice Baru
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Outstanding', value: fmt(totalOutstanding), color: '#dc2626' },
          { label: 'Overdue', value: `${overdueCount} invoice`, color: '#b91c1c' },
          { label: 'Paid This Month', value: fmt(paidThisMonth), color: '#1a472a' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {!list.length ? (
          <p className="text-sm text-gray-400 text-center py-12">Belum ada invoice</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">No. INV</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Buyer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Jatuh Tempo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Outstanding</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((inv: any) => (
                <tr key={inv.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${inv.status === 'overdue' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-5 py-3 font-medium text-gray-900">{inv.inv_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{inv.buyers?.company_name ?? '—'}</p>
                    {inv.buyers?.country && <p className="text-xs text-gray-400">{inv.buyers.country}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{inv.issue_date}</td>
                  <td className={`px-4 py-3 ${inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {inv.due_date ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{inv.total_amount ? fmt(inv.total_amount, inv.currency) : '—'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${inv.amount_due > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {inv.amount_due > 0 ? fmt(inv.amount_due, inv.currency) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/invoices/${inv.id}`} className="text-xs text-green-700 hover:underline">Detail →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
