'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Item, ItemGrade, Supplier } from '@/types'

type Props = {
  item: Item
  grades: ItemGrade[]
  suppliers: Supplier[]
  onClose: () => void
}

export function UpdatePriceModal({ item, grades, suppliers, onClose }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [sourceType, setSourceType] = useState('market')
  const [supplierId, setSupplierId] = useState('')
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const rows = grades
      .filter((g) => prices[g.grade_code] && prices[g.grade_code] !== '')
      .map((g) => ({
        item_id: item.id,
        grade_code: g.grade_code,
        price_per_unit: parseFloat(prices[g.grade_code]),
        currency: 'IDR',
        price_date: date,
        source_type: sourceType,
        supplier_id: sourceType === 'supplier' && supplierId ? supplierId : null,
      }))

    if (rows.length === 0) {
      setError('Isi minimal satu harga')
      setSaving(false)
      return
    }

    const { error: upsertError } = await supabase
      .from('price_history')
      .upsert(rows, { onConflict: 'item_id,grade_code,price_date,source_type' })

    if (upsertError) {
      setError(upsertError.message)
    } else {
      router.refresh()
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Update Harga</h2>
            <p className="text-sm text-gray-500">{item.name} {item.name_en ? `· ${item.name_en}` : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sumber</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
              >
                <option value="market">Pasar</option>
                <option value="supplier">Supplier</option>
                <option value="contract">Kontrak</option>
              </select>
            </div>
          </div>

          {sourceType === 'supplier' && suppliers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
              >
                <option value="">— pilih supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Harga per Grade (IDR/kg)</label>
            <div className="space-y-2">
              {grades.map((g) => (
                <div key={g.grade_code} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium text-gray-700">Grade {g.grade_code}</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={prices[g.grade_code] ?? ''}
                    onChange={(e) => setPrices((p) => ({ ...p, [g.grade_code]: e.target.value }))}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                  <span className="text-xs text-gray-400">IDR</span>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ backgroundColor: '#1a472a' }}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
