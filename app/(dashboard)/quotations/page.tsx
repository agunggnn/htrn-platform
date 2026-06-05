import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-50 text-blue-700',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  expired: 'bg-orange-50 text-orange-600',
}

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data: quotations } = await supabase
    .from('quotations')
    .select('*, buyers(company_name, country)')
    .order('created_at', { ascending: false })

  const fmt = (n: number, cur = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotation</h1>
          <p className="text-sm text-gray-500 mt-0.5">{quotations?.length ?? 0} quotation</p>
        </div>
        <Link href="/quotations/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: '#1a472a' }}>
          <Plus className="w-4 h-4" /> Quotation Baru
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {!quotations?.length ? (
          <p className="text-sm text-gray-400 text-center py-12">Belum ada quotation</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">No. QUO</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Buyer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Berlaku s/d</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {quotations.map((q: any) => (
                <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-gray-900">{q.quo_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{q.buyers?.company_name ?? '—'}</p>
                    {q.buyers?.country && <p className="text-xs text-gray-400">{q.buyers.country}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{q.date}</td>
                  <td className="px-4 py-3 text-gray-500">{q.valid_until ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {q.total_amount ? fmt(q.total_amount, q.currency) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_STYLE[q.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/quotations/${q.id}`} className="text-xs text-green-700 hover:underline">Detail →</Link>
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
