'use client'

import Link from 'next/link'
import type { Buyer, Quotation, Invoice } from '@/types'

type Props = {
  tab: string
  buyerId: string
  buyer: Buyer
  quotations: Quotation[]
  invoices: Invoice[]
  statusColor: Record<string, string>
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'notes', label: 'Catatan' },
]

export function BuyerTabs({ tab, buyerId, buyer, quotations, invoices, statusColor }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div>
      {/* Tab nav */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/buyers/${buyerId}?tab=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-green-700 text-green-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'quotations' && quotations.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {quotations.length}
              </span>
            )}
            {t.key === 'invoices' && invoices.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {invoices.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-3">
            {[
              ['Perusahaan', buyer.company_name],
              ['Kontak', buyer.contact_name ?? '—'],
              ['Email', buyer.email ?? '—'],
              ['Telepon', buyer.phone ?? '—'],
              ['Negara', buyer.country ?? '—'],
              ['Currency', buyer.currency],
              ['Bahasa', buyer.language === 'en' ? 'English' : 'Indonesia'],
              ['Payment Terms', buyer.payment_terms ?? '—'],
              ['Tax ID', buyer.tax_id ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="mb-0.5 text-xs text-gray-400">{label}</p>
                <p className="font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotations */}
      {tab === 'quotations' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {quotations.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Belum ada quotation</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
                    No. QUO
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium">{q.quo_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{q.date}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {q.total_amount ? fmt(q.total_amount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[q.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/quotations/${q.id}`}
                        className="text-xs text-green-700 hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {invoices.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">Belum ada invoice</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
                    No. INV
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Jatuh Tempo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">
                    Outstanding
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`border-b border-gray-50 hover:bg-gray-50/50 ${inv.status === 'overdue' ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-5 py-3 font-medium">{inv.inv_number ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{inv.due_date ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {inv.total_amount ? fmt(inv.total_amount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {inv.amount_due ? fmt(inv.amount_due) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[inv.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-xs text-green-700 hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Notes */}
      {tab === 'notes' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          {buyer.notes ? (
            <p className="text-sm whitespace-pre-wrap text-gray-700">{buyer.notes}</p>
          ) : (
            <p className="text-sm text-gray-400">Belum ada catatan.</p>
          )}
          <div className="mt-4">
            <Link
              href={`/buyers/${buyerId}/edit`}
              className="text-sm text-green-700 hover:underline"
            >
              Edit catatan →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
