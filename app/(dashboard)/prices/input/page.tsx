'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Item, ItemGrade } from '@/types'

export default function BulkPriceInputPage() {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [sourceType, setSourceType] = useState('market')
  const [items, setItems] = useState<Item[]>([])
  const [grades, setGrades] = useState<ItemGrade[]>([])
  const [prices, setPrices] = useState<Record<string, string>>({}) // key: itemId_gradeCode
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('items').select('*').eq('is_active', true).order('name'),
      supabase.from('item_grades').select('*').eq('is_active', true),
    ]).then(([{ data: itemData }, { data: gradeData }]) => {
      setItems(itemData ?? [])
      setGrades(gradeData ?? [])
    })
  }, [])

  // Autofill from yesterday
  async function autofillYesterday() {
    const supabase = createClient()
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const { data } = await supabase
      .from('price_history')
      .select('item_id, grade_code, price_per_unit')
      .eq('price_date', yesterday)
    if (data) {
      const filled: Record<string, string> = {}
      data.forEach((p) => { filled[`${p.item_id}_${p.grade_code}`] = String(p.price_per_unit) })
      setPrices(filled)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const supabase = createClient()

    const rows = Object.entries(prices)
      .filter(([, v]) => v !== '')
      .map(([key, value]) => {
        const [item_id, grade_code] = key.split('_')
        return {
          item_id,
          grade_code,
          price_per_unit: parseFloat(value),
          currency: 'IDR',
          price_date: date,
          source_type: sourceType,
        }
      })

    if (rows.length === 0) {
      setError('Tidak ada harga yang diisi')
      setSaving(false)
      return
    }

    const { error: upsertError } = await supabase
      .from('price_history')
      .upsert(rows, { onConflict: 'item_id,grade_code,price_date,source_type' })

    if (upsertError) {
      setError(upsertError.message)
    } else {
      setSaved(true)
      setTimeout(() => { router.push('/prices'); router.refresh() }, 1200)
    }
    setSaving(false)
  }

  // All unique grades across all items
  const allGradeCodes = [...new Set(grades.map((g) => g.grade_code))]

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Input Harga Harian</h1>
          <p className="text-sm text-gray-500 mt-0.5">Isi semua harga sekaligus</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={autofillYesterday}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Salin Kemarin
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: '#1a472a' }}
          >
            {saved ? '✓ Tersimpan' : saving ? 'Menyimpan...' : 'Simpan Semua'}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sumber</label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700"
          >
            <option value="market">Pasar</option>
            <option value="supplier">Supplier</option>
            <option value="contract">Kontrak</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 w-40">Rempah</th>
              {allGradeCodes.map((g) => (
                <th key={g} className="text-left px-3 py-3 text-xs font-semibold text-gray-500">
                  Grade {g}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const itemGrades = grades.filter((g) => g.item_id === item.id)
              return (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.name_en && <p className="text-xs text-gray-400">{item.name_en}</p>}
                  </td>
                  {allGradeCodes.map((gradeCode) => {
                    const hasGrade = itemGrades.some((g) => g.grade_code === gradeCode)
                    const key = `${item.id}_${gradeCode}`
                    return (
                      <td key={gradeCode} className="px-3 py-2">
                        {hasGrade ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400">Rp</span>
                            <input
                              type="number"
                              placeholder="—"
                              value={prices[key] ?? ''}
                              onChange={(e) =>
                                setPrices((p) => ({ ...p, [key]: e.target.value }))
                              }
                              className="w-28 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-700"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
