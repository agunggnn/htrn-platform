'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  FlaskConical,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Quotation } from '@/types'

export type QuotationRow = Quotation & {
  buyers: { company_name: string; country: string | null } | null
}

type Props = {
  initialQuotations: QuotationRow[]
}

type SortField = 'quo_number' | 'buyer' | 'date' | 'valid_until' | 'total_amount' | 'status'
type SortOrder = 'asc' | 'desc'
type DataMode = 'prod' | 'all' | 'test'

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  accepted: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  expired: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function isTestQuotation(q: QuotationRow): boolean {
  if (q.is_test === true) return true
  const num = (q.quo_number || '').toUpperCase()
  return num.includes('001') || num.includes('DEMO') || num.includes('TEST') || num.includes('MOCK')
}

export function QuotationsTableView({ initialQuotations }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dataMode, setDataMode] = useState<DataMode>('prod')
  const [sortField, setSortField] = useState<SortField>('date')
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
    return initialQuotations.filter((q) => {
      const isTest = isTestQuotation(q)

      // 1. Data Mode Isolation
      if (dataMode === 'prod' && isTest) return false
      if (dataMode === 'test' && !isTest) return false

      // 2. Status Filter
      if (statusFilter !== 'all' && q.status !== statusFilter) return false

      // 3. Search Query
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchNum = q.quo_number?.toLowerCase().includes(query)
        const matchBuyer = q.buyers?.company_name?.toLowerCase().includes(query)
        const matchCountry = q.buyers?.country?.toLowerCase().includes(query)
        if (!matchNum && !matchBuyer && !matchCountry) return false
      }

      return true
    })
  }, [initialQuotations, search, statusFilter, dataMode])

  // Sorting Logic
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''

      switch (sortField) {
        case 'quo_number':
          valA = a.quo_number || ''
          valB = b.quo_number || ''
          break
        case 'buyer':
          valA = a.buyers?.company_name || ''
          valB = b.buyers?.company_name || ''
          break
        case 'date':
          valA = a.date || ''
          valB = b.date || ''
          break
        case 'valid_until':
          valA = a.valid_until || ''
          valB = b.valid_until || ''
          break
        case 'total_amount':
          valA = a.total_amount || 0
          valB = b.total_amount || 0
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

  const testCount = initialQuotations.filter(isTestQuotation).length
  const prodCount = initialQuotations.length - testCount

  return (
    <div className="space-y-4">
      {/* Control Bar: Search, Filters, Data Mode */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor penawaran atau nama buyer..."
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
              <option value="accepted">Disepakati (Accepted)</option>
              <option value="rejected">Ditolak (Rejected)</option>
              <option value="expired">Kedaluwarsa (Expired)</option>
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
              Semua ({initialQuotations.length})
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
            <FileText className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-900">Tidak ada quotation ditemukan</p>
            <p className="text-xs text-gray-500">Coba ubah kata kunci pencarian atau filter status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('quo_number')}
                    className="cursor-pointer px-5 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>No. QUO</span>
                      {sortField === 'quo_number' ? (
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
                    onClick={() => handleSort('date')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tanggal</span>
                      {sortField === 'date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('valid_until')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Berlaku s/d</span>
                      {sortField === 'valid_until' ? (
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
                      <span>Total Nilai (IDR)</span>
                      {sortField === 'total_amount' ? (
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
                {sortedData.map((q) => {
                  const isTest = isTestQuotation(q)
                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isTest ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/quotations/${q.id}`}
                            className="text-emerald-800 hover:text-emerald-950 hover:underline font-semibold"
                          >
                            {q.quo_number ?? '—'}
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
                        <p className="font-medium text-gray-800">{q.buyers?.company_name ?? '—'}</p>
                        {q.buyers?.country && (
                          <p className="text-xs text-gray-400">{q.buyers.country}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{q.date}</td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{q.valid_until ?? '—'}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-900 whitespace-nowrap">
                        {q.total_amount ? formatCurrency(q.total_amount, 'IDR') : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs capitalize ${
                            STATUS_STYLE[q.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/quotations/${q.id}`}
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
          <span>Menampilkan {sortedData.length} dari {initialQuotations.length} penawaran</span>
          {dataMode === 'prod' && testCount > 0 && (
            <span className="text-amber-700">
              * {testCount} data uji disembunyikan agar laporan operasional riil tetap bersih.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
