'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  PackageCheck,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Boxes,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import type { StockMovement, StockSummary, Item } from '@/types'

type StockOverviewProps = {
  summary: StockSummary[]
  movements: (StockMovement & { items: { name: string } | null })[]
  items: Item[]
}

export function StockOverview({ summary, movements, items }: StockOverviewProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state for manual adjustment
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? '')
  const [gradeCode, setGradeCode] = useState('Super')
  const [movementType, setMovementType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [quantity, setQuantity] = useState(100)
  const [notes, setNotes] = useState('')

  const totalCurrentStockKg = summary.reduce((s, i) => s + i.current_stock, 0)
  const totalInKg = summary.reduce((s, i) => s + i.total_in, 0)
  const totalOutKg = summary.reduce((s, i) => s + i.total_out, 0)

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const item = items.find((i) => i.id === selectedItemId)

      const { error } = await supabase.from('stock_movements').insert({
        item_id: selectedItemId,
        grade_code: gradeCode,
        movement_type: movementType,
        quantity: Number(quantity),
        unit: item?.unit ?? 'kg',
        reference_type: 'manual',
        notes: notes || 'Penyesuaian stok manual',
      })

      if (error) throw error

      setShowModal(false)
      setNotes('')
      router.refresh()
    } catch (err: unknown) {
      const e = err as Error
      alert(`Gagal mencatat mutasi stok: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(n)

  const getStockStatusBadge = (stock: number) => {
    if (stock <= 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
          <AlertTriangle className="w-3 h-3" /> Stok Habis
        </span>
      )
    }
    if (stock < 500) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
          <AlertTriangle className="w-3 h-3" /> Stok Rendah
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
        <CheckCircle className="w-3 h-3" /> Cukup
      </span>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stok Gudang & Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manajemen persediaan rempah, mutasi stok masuk (PO) dan stok keluar (Invoice Export).
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: '#1a472a' }}
        >
          <Plus className="w-4 h-4" /> Catat Mutasi Stok
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(26, 71, 42, 0.1)' }}
          >
            <Boxes className="w-6 h-6 text-[#1a472a]" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Total Posisi Stok Gudang
            </p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">
              {fmtNum(totalCurrentStockKg)} <span className="text-sm font-normal text-gray-500">kg</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(totalCurrentStockKg / 1000).toFixed(2)} Metrik Ton
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Total Stok Masuk (PO/Panen)
            </p>
            <p className="text-2xl font-bold text-green-700 leading-tight">
              {fmtNum(totalInKg)} <span className="text-sm font-normal text-gray-500">kg</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Pengadaan dari supplier</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Total Stok Keluar (Ekspor)
            </p>
            <p className="text-2xl font-bold text-red-700 leading-tight">
              {fmtNum(totalOutKg)} <span className="text-sm font-normal text-gray-500">kg</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Pengapalan Commercial Invoice</p>
          </div>
        </div>
      </div>

      {/* Stock Summary Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#1a472a]" />
            <h2 className="text-base font-bold text-gray-900">
              Posisi Stok per Komoditas & Grade
            </h2>
          </div>
          <span className="text-xs text-gray-400 font-medium">{summary.length} varietas</span>
        </div>

        {!summary.length ? (
          <p className="py-12 text-center text-sm text-gray-400">Belum ada data stok</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                <th className="px-5 py-3 text-left">Komoditas Rempah</th>
                <th className="px-4 py-3 text-left">Grade</th>
                <th className="px-4 py-3 text-right">Stok Masuk (kg)</th>
                <th className="px-4 py-3 text-right">Stok Keluar (kg)</th>
                <th className="px-5 py-3 text-right">Sisa Stok (kg)</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    {row.item_name} {row.item_name_en ? `(${row.item_name_en})` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
                      Grade {row.grade_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 font-mono">
                    {fmtNum(row.total_in)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 font-mono">
                    {fmtNum(row.total_out)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900 font-mono">
                    {fmtNum(row.current_stock)} {row.unit}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {getStockStatusBadge(row.current_stock)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Stock Movement Log */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Riwayat Mutasi Stok Terkini (Audit Log)
          </h2>
          <span className="text-xs text-gray-400">{movements.length} entri</span>
        </div>

        {!movements.length ? (
          <p className="py-8 text-center text-sm text-gray-400">Belum ada riwayat mutasi stok</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
                <th className="px-5 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">Komoditas & Grade</th>
                <th className="px-4 py-3 text-center">Jenis Mutasi</th>
                <th className="px-4 py-3 text-right">Jumlah</th>
                <th className="px-5 py-3 text-left">Keterangan / Referensi</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const isIN = m.movement_type === 'in'
                return (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(m.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">
                        {m.items?.name ?? '—'}
                      </span>{' '}
                      <span className="text-xs text-gray-500">Grade {m.grade_code}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isIN
                            ? 'bg-green-50 text-green-700'
                            : m.movement_type === 'out'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {isIN ? '+ MASUK' : m.movement_type === 'out' ? '- KELUAR' : 'PENYESUAIAN'}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold font-mono ${
                        isIN ? 'text-green-700' : m.movement_type === 'out' ? 'text-red-700' : 'text-blue-700'
                      }`}
                    >
                      {isIN ? '+' : m.movement_type === 'out' ? '-' : ''}
                      {fmtNum(m.quantity)} {m.unit}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {m.notes ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Manual Movement */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <h2 className="text-lg font-bold text-gray-900">Catat Mutasi Stok Manual</h2>

            <form onSubmit={handleAddMovement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Komoditas Rempah
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.name_en})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Grade
                  </label>
                  <select
                    value={gradeCode}
                    onChange={(e) => setGradeCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                  >
                    {['Super', 'A', 'B', 'FAQ', 'C'].map((g) => (
                      <option key={g} value={g}>
                        Grade {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Jenis Mutasi
                  </label>
                  <select
                    value={movementType}
                    onChange={(e) =>
                      setMovementType(e.target.value as 'in' | 'out' | 'adjustment')
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                  >
                    <option value="in">+ Stok Masuk (PO)</option>
                    <option value="out">- Stok Keluar (Ekspor)</option>
                    <option value="adjustment">Penyesuaian Manual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Jumlah Tonnage (kg)
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Keterangan / Catatan
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Penerimaan panen petani lokal / audit stok gudang"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a472a]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#1a472a' }}
                >
                  {loading ? 'Menyimpan...' : 'Simpan Mutasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
