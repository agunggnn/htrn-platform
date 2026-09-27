'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
  FlaskConical,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { PurchaseOrder } from '@/types'

export type PurchaseOrderRow = PurchaseOrder & {
  suppliers: { name: string } | null
  quotations: { quo_number: string | null } | null
}

type Props = {
  initialPurchaseOrders: PurchaseOrderRow[]
}

type SortField = 'po_number' | 'supplier' | 'quo_number' | 'order_date' | 'expected_date' | 'total_amount' | 'status'
type SortOrder = 'asc' | 'desc'
type DataMode = 'prod' | 'all' | 'test'

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  received: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function isTestPO(po: PurchaseOrderRow): boolean {
  if (po.is_test === true) return true
  const num = (po.po_number || '').toUpperCase()
  return num.includes('001') || num.includes('DEMO') || num.includes('TEST') || num.includes('MOCK')
}

export function PurchaseOrdersTableView({ initialPurchaseOrders }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dataMode, setDataMode] = useState<DataMode>('prod')
  const [sortField, setSortField] = useState<SortField>('order_date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Filter & Search
  const filteredData = useMemo(() => {
    return initialPurchaseOrders.filter((po) => {
      const isTest = isTestPO(po)

      // 1. Data mode isolation
      if (dataMode === 'prod' && isTest) return false
      if (dataMode === 'test' && !isTest) return false

      // 2. Status filter
      if (statusFilter !== 'all' && po.status !== statusFilter) return false

      // 3. Search query
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchNum = po.po_number?.toLowerCase().includes(query)
        const matchSupplier = po.suppliers?.name?.toLowerCase().includes(query)
        const matchQuo = po.quotations?.quo_number?.toLowerCase().includes(query)
        if (!matchNum && !matchSupplier && !matchQuo) return false
      }

      return true
    })
  }, [initialPurchaseOrders, search, statusFilter, dataMode])

  // Sorting
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: string | number = ''
      let valB: string | number = ''

      switch (sortField) {
        case 'po_number':
          valA = a.po_number || ''
          valB = b.po_number || ''
          break
        case 'supplier':
          valA = a.suppliers?.name || ''
          valB = b.suppliers?.name || ''
          break
        case 'quo_number':
          valA = a.quotations?.quo_number || ''
          valB = b.quotations?.quo_number || ''
          break
        case 'order_date':
          valA = a.order_date || ''
          valB = b.order_date || ''
          break
        case 'expected_date':
          valA = a.expected_date || ''
          valB = b.expected_date || ''
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

  const testCount = initialPurchaseOrders.filter(isTestPO).length
  const prodCount = initialPurchaseOrders.length - testCount

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filters, Data Mode */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nomor PO atau nama supplier..."
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
              <option value="confirmed">Dikonfirmasi (Confirmed)</option>
              <option value="received">Diterima (Received)</option>
              <option value="cancelled">Dibatalkan (Cancelled)</option>
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
              Semua ({initialPurchaseOrders.length})
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
            <ShoppingCart className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm font-medium text-gray-900">Tidak ada purchase order ditemukan</p>
            <p className="text-xs text-gray-500">Coba ubah kata kunci pencarian atau filter status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200 select-none">
                <tr>
                  <th
                    onClick={() => handleSort('po_number')}
                    className="cursor-pointer px-5 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>No. PO</span>
                      {sortField === 'po_number' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('supplier')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Supplier (Maklon Hub)</span>
                      {sortField === 'supplier' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('quo_number')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>QUO Terkait</span>
                      {sortField === 'quo_number' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('order_date')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tgl Order</span>
                      {sortField === 'order_date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-emerald-700" /> : <ArrowDown className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('expected_date')}
                    className="cursor-pointer px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Target Siap Kirim</span>
                      {sortField === 'expected_date' ? (
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
                      <span>Modal HPP (IDR)</span>
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
                {sortedData.map((po) => {
                  const isTest = isTestPO(po)
                  return (
                    <tr
                      key={po.id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isTest ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/purchase-orders/${po.id}`}
                            className="text-emerald-800 hover:text-emerald-950 hover:underline font-semibold"
                          >
                            {po.po_number ?? '—'}
                          </Link>
                          {isTest && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                              <FlaskConical className="h-2.5 w-2.5" />
                              TEST
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-gray-800">
                        {po.suppliers?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">
                        {po.quotations?.quo_number ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{po.order_date}</td>
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{po.expected_date ?? '—'}</td>
                      <td className="px-4 py-3.5 text-right font-medium text-gray-900 whitespace-nowrap">
                        {po.total_amount ? formatCurrency(po.total_amount, 'IDR') : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs capitalize ${
                            STATUS_STYLE[po.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/purchase-orders/${po.id}`}
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
          <span>Menampilkan {sortedData.length} dari {initialPurchaseOrders.length} purchase order</span>
          {dataMode === 'prod' && testCount > 0 && (
            <span className="text-amber-700">
              * {testCount} pesanan data uji disembunyikan dari rekap pengeluaran operasional.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
