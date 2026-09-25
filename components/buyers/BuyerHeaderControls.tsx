'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Kanban, Table2, Plus, Upload, Download } from 'lucide-react'
import { BuyerImportModal } from './BuyerImportModal'

type Props = {
  view: 'pipeline' | 'table'
  q?: string
  country?: string
}

export function BuyerHeaderControls({ view, q, country }: Props) {
  const [showImportModal, setShowImportModal] = useState(false)

  function handleExport() {
    let url = '/api/buyers/export?'
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (country) params.set('country', country)
    url += params.toString()
    window.open(url, '_blank')
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* View Switcher Toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
          <Link
            href={`/buyers?view=pipeline${q ? `&q=${q}` : ''}${country ? `&country=${country}` : ''}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              view === 'pipeline'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Kanban className={`w-3.5 h-3.5 ${view === 'pipeline' ? 'text-[#1a472a]' : ''}`} /> Pipeline Board
          </Link>
          <Link
            href={`/buyers?view=table${q ? `&q=${q}` : ''}${country ? `&country=${country}` : ''}`}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              view === 'table'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Table2 className={`w-3.5 h-3.5 ${view === 'table' ? 'text-[#1a472a]' : ''}`} /> Table View
          </Link>
        </div>

        {/* Import & Export Action Buttons */}
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-xs transition-colors cursor-pointer"
          title="Impor prospek dari file CSV / Streak"
        >
          <Upload className="w-3.5 h-3.5 text-gray-600" /> Impor CSV
        </button>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-xs transition-colors cursor-pointer"
          title="Unduh seluruh data buyer ke CSV"
        >
          <Download className="w-3.5 h-3.5 text-gray-600" /> Ekspor CSV
        </button>

        {/* Create Buyer Button */}
        <Link
          href="/buyers/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-xs hover:opacity-95 transition-opacity"
          style={{ backgroundColor: '#1a472a' }}
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Prospek
        </Link>
      </div>

      {showImportModal && (
        <BuyerImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
