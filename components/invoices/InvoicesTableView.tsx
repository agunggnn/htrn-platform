'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Receipt,
  FlaskConical,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Invoice } from '@/types'

export type InvoiceWithBuyer = Invoice & {
  buyers: { company_name: string; country: string | null } | null
}

type Props = {
  initialInvoices: InvoiceWithBuyer[]
}

type SortField = 'inv_number' | 'buyer' | 'issue_date' | 'due_date' | 'total_amount' | 'amount_due' | 'status'
type SortOrder = 'asc' | 'desc'
type DataMode = 'prod' | 'all' | 'test'

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  partial: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
}

export function isTestInvoice(inv: InvoiceWithBuyer): boolean {
  if (inv.is_test === true) return true
  const num = (inv.inv_number || '').toUpperCase()
  return num.includes('001') || num.includes('DEMO') || num.includes('TEST') || num.includes('MOCK')
}

export function InvoicesTableView({ initialInvoices }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dataMode, setDataMode] = useState<DataMode>('prod')
  const [sortField, setSortField] = useState<SortField>('issue_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return initialInvoices.filter((inv) => {
      const isTest = isTestInvoice(inv)

      // 1. Data Mode Isolation
      if (dataMode === 'prod' && isTest) return false
      if (dataMode === 'test' && !isTest) return false

      // 2. Status Filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false

      // 3. Search Query
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchNum = inv.inv_number?.toLowerCase().includes(query)
        const matchBuyer = inv.buyers?.company_name?.toLowerCase().includes(query)
        const matchCountry = inv.buyers?.country?.toLowerCase().includes(query)
        if (!matchNum && !matchBuyer && !matchCountry) return false
      }

      return true
    })
  }, [initialInvoices, search, statusFilter, dataMode])

  // Sorting Logic
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''

      switch (sortField) {
        case 'inv_number':
          valA = a.inv_number || ''
          valB = b.inv_number || ''
          break
        case 'buyer':
          valA = a.buyers?.company_name || ''
          valB = b.buyers?.company_name || ''
          break
        case 'issue_date':
          valA = a.issue_date || ''
          valB = b.issue_date || ''
          break
        case 'due_date':
          valA = a.due_date || ''
          valB = b.due_date || ''
          break
        case 'total_amount':
          valA = a.total_amount || 0
          valB = b.total_amount || 0
          break
        case 'amount_due':
          valA = a.amount_due || 0
          valB = b.amount_due || 0
          break
        case 'status':
          valA = a.status || ''
          valB = b.status || ''
          break
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA))
    })
  }, [filteredData, sortField, sortOrder])

  // Summary Metrics calculated dynamically on filtered mode
  const metrics = useMemo(() => {
    const list = dataMode === 'prod'
      ? initialInvoices.filter((i) => !isTestInvoice(i))
      : dataMode === 'test'
      ? initialInvoices.filter(isTestInvoice)
      : initialInvoices

    const totalOutstanding = list
      .filter((i) => ['sent', 'partial', 'overdue'].includes(i.status))
      .reduce((s, i) => s + (i.amount_due ?? 0), 0)

    const overdueCount = list.filter((i) => i.status === 'overdue').length

    const currentMonth = new Date().toISOString().slice(0, 7)
    const paidThisMonth = list
      .filter((i) => i.status === 'paid' && i.issue_date?.startsWith(currentMonth))
      .reduce((s, i) => s + (i.total_amount ?? 0), 0)

    return { totalOutstanding, overdueCount, paidThisMonth }
  }, [initialInvoices, dataMode])

  const testCount = initialInvoices.filter(isTestInvoice).length
  const prodCount = initialInvoices.length - testCount

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Total Outstanding (Piutang)
          </p>
          <p className="text-2xl font-bold text-rose-600">
            {formatCurrency(metrics.totalOutstanding, 'IDR')}
          </p>
          <p className="text-xs text-gray-400 mt-1">Tagihan aktif belum lunas</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Faktur Jatuh Tempo (Overdue)
          </p>
          <p className="text-2xl font-bold text-red-700">
            {metrics.overdueCount} invoice
          </p>
          <p className="text-xs text-gray-400 mt-1">Perlu follow-up penagihan</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-2xs">
          <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Pelunasan Bulan Ini
          </p>
          <p className="text-2xl font-bold text-emerald-800">
            {formatCurrency(metrics.paidThisMonth, 'IDR')}
          </p>
          <p className="text-xs text-gray-400 mt-1">Penerimaan CBD / transfer kas</p>
        </div>
      </div>

      {/* Controls Bar: Search, Filters, Data Mode */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor invoice atau nama buyer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Status Dropdown & Data Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-gray-700 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Terkirim (Sent)</option>
              <option value="partial">Sebagian (Partial)</option>
              <option value="paid">Lunas (Paid)</option>
              <option value="overdue">Jatuh Tempo (Overdue)</option>
            </select>
          </div>

          {/* Test / Prod Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setDataMode('prod')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                dataMode === 'prod'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Produksi ({prodCount})
            </button>
            <button
              type="button"
              onClick={() => setDataMode('all')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                dataMode === 'all'
                  ? 'bg-emerald-800 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semua ({initialInvoices.length})
            </button>
            <button
              type="button"
              onClick={() => setDataMode('test')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                dataMode === 'test'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Data Uji ({testCount})
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xs">
        {sortedData.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-900">Tidak ada invoice ditemukan</p>
            <p className="text-xs text-gray-500">Coba ubah kata kunci pencarian atau filter status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('inv_number')}
                    className="cursor-pointer px-5 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>No. INV</span>
                      {sortField === 'inv_number' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('buyer')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Buyer</span>
                      {sortField === 'buyer' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('issue_date')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tanggal</span>
                      {sortField === 'issue_date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('due_date')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Jatuh Tempo</span>
                      {sortField === 'due_date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('total_amount')}
                    className="cursor-pointer px-4 py-3 text-right hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Total Tagihan (IDR)</span>
                      {sortField === 'total_amount' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('amount_due')}
                    className="cursor-pointer px-4 py-3 text-right hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Sisa Tagihan (IDR)</span>
                      {sortField === 'amount_due' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-normal">
                {sortedData.map((inv) => {
                  const isTest = isTestInvoice(inv)
                  const isOverdue = inv.status === 'overdue'

                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isOverdue ? 'bg-rose-50/20' : isTest ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-emerald-800 hover:text-emerald-950 hover:underline font-semibold"
                          >
                            {inv.inv_number ?? '—'}
                          </Link>
                          {isTest && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                              <FlaskConical className="h-2.5 w-2.5" />
                              TEST
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-gray-800">{inv.buyers?.company_name ?? '—'}</p>
                        {inv.buyers?.country && (
                          <p className="text-xs text-gray-400">{inv.buyers.country}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{inv.issue_date}</td>
                      <td
                        className={`px-4 py-3.5 whitespace-nowrap ${
                          isOverdue ? 'font-semibold text-rose-700' : 'text-gray-500'
                        }`}
                      >
                        {inv.due_date ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-900 whitespace-nowrap">
                        {inv.total_amount ? formatCurrency(inv.total_amount, 'IDR') : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap">
                        {(inv.amount_due ?? 0) > 0 ? (
                          <span className="text-rose-600 font-semibold">
                            {formatCurrency(inv.amount_due, 'IDR')}
                          </span>
                        ) : (
                          <span className="text-gray-400">Lunas</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs capitalize ${
                            STATUS_STYLE[inv.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="rounded-md bg-gray-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950 transition-colors"
                        >
                          Detail →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer info */}
        <div className="bg-gray-50/80 px-5 py-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between items-center">
          <span>Menampilkan {sortedData.length} dari {initialInvoices.length} invoice</span>
          {dataMode === 'prod' && testCount > 0 && (
            <span className="text-amber-700">
              * {testCount} faktur simulasi data uji disembunyikan agar pembukuan kas riil tidak terganggu.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
