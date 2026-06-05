import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Bucket = { label: string; invoices: any[] }

export default async function AgingPage() {
  const supabase = await createClient()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, buyers(company_name)')
    .in('status', ['sent', 'partial', 'overdue'])
    .order('due_date')

  const today = new Date()
  const list = invoices ?? []

  function daysPastDue(dueDate: string) {
    const due = new Date(dueDate)
    return Math.floor((today.getTime() - due.getTime()) / 86400000)
  }

  const buckets: Bucket[] = [
    { label: 'Current (belum jatuh tempo)', invoices: list.filter((i) => !i.due_date || daysPastDue(i.due_date) < 0) },
    { label: '1–30 hari', invoices: list.filter((i) => i.due_date && daysPastDue(i.due_date) >= 0 && daysPastDue(i.due_date) <= 30) },
    { label: '31–60 hari', invoices: list.filter((i) => i.due_date && daysPastDue(i.due_date) > 30 && daysPastDue(i.due_date) <= 60) },
    { label: '60+ hari', invoices: list.filter((i) => i.due_date && daysPastDue(i.due_date) > 60) },
  ]

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  const total = (arr: any[]) => arr.reduce((s, i) => s + (i.amount_due ?? 0), 0)

  const BUCKET_COLORS = ['text-gray-700', 'text-yellow-700', 'text-orange-600', 'text-red-600']

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Aging Report</h1>
        <p className="text-sm text-gray-500 mt-0.5">Invoice belum lunas per hari ini</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {buckets.map(({ label, invoices: inv }, i) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${BUCKET_COLORS[i]}`}>{fmt(total(inv))}</p>
            <p className="text-xs text-gray-400 mt-0.5">{inv.length} invoice</p>
          </div>
        ))}
      </div>

      {/* Detail per bucket */}
      <div className="space-y-6">
        {buckets.map(({ label, invoices: inv }, i) => inv.length > 0 && (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between`}>
              <h2 className={`text-sm font-semibold ${BUCKET_COLORS[i]}`}>{label}</h2>
              <span className={`text-sm font-bold ${BUCKET_COLORS[i]}`}>{fmt(total(inv))}</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50">
                  <th className="text-left px-5 py-2 text-xs font-semibold text-gray-500">Invoice</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Buyer</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Jatuh Tempo</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Outstanding</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {inv.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-2.5 font-medium">{invoice.inv_number}</td>
                    <td className="px-4 py-2.5 text-gray-600">{invoice.buyers?.company_name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{invoice.due_date}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-red-600">{fmt(invoice.amount_due)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/invoices/${invoice.id}`} className="text-xs text-green-700 hover:underline">Detail →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
