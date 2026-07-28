'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import type { Item, ItemGrade } from '@/types'

type Props = { items: Item[]; grades: ItemGrade[] }

export function ItemsCatalog({ items: initial, grades: initialGrades }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addingItem, setAddingItem] = useState(false)
  const [addingGrade, setAddingGrade] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState({ name: '', name_en: '', unit: 'kg', hs_code: '' })
  const [gradeForm, setGradeForm] = useState({ grade_code: '', grade_description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemForm.name) {
      setError('Nama wajib')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error: err } = await supabase.from('items').insert(itemForm)
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    setItemForm({ name: '', name_en: '', unit: 'kg', hs_code: '' })
    setAddingItem(false)
    setSaving(false)
    router.refresh()
  }

  async function addGrade(e: React.FormEvent, itemId: string) {
    e.preventDefault()
    if (!gradeForm.grade_code) {
      setError('Kode grade wajib')
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('item_grades')
      .insert({ item_id: itemId, ...gradeForm })
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    setGradeForm({ grade_code: '', grade_description: '' })
    setAddingGrade(null)
    setSaving(false)
    router.refresh()
  }

  async function toggleItem(id: string, is_active: boolean) {
    const supabase = createClient()
    await supabase.from('items').update({ is_active }).eq('id', id)
    router.refresh()
  }

  async function deleteGrade(id: string) {
    const supabase = createClient()
    await supabase.from('item_grades').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {initial.map((item) => {
        const itemGrades = initialGrades.filter((g) => g.item_id === item.id)
        const isExpanded = expanded === item.id
        return (
          <div
            key={item.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
          >
            <div
              className="flex cursor-pointer items-center justify-between px-5 py-4 hover:bg-gray-50"
              onClick={() => setExpanded(isExpanded ? null : item.id)}
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400">
                    {item.name_en ?? ''}
                    {item.hs_code ? ` · HS: ${item.hs_code}` : ''} · {item.unit}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{itemGrades.length} grade</span>
                <label
                  className="relative inline-flex cursor-pointer items-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={item.is_active}
                    onChange={(e) => toggleItem(item.id, e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-5 w-9 rounded-full bg-gray-200 peer-checked:bg-green-600 after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-4" />
                </label>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 px-5 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {itemGrades.map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm"
                    >
                      <span className="font-medium text-green-800">Grade {g.grade_code}</span>
                      {g.grade_description && (
                        <span className="text-xs text-green-600">{g.grade_description}</span>
                      )}
                      <button
                        onClick={() => deleteGrade(g.id)}
                        className="ml-1 text-green-300 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {addingGrade === item.id ? (
                    <form
                      onSubmit={(e) => addGrade(e, item.id)}
                      className="flex items-center gap-2"
                    >
                      <input
                        value={gradeForm.grade_code}
                        onChange={(e) =>
                          setGradeForm((f) => ({ ...f, grade_code: e.target.value }))
                        }
                        placeholder="A / Super / FAQ"
                        autoFocus
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:ring-1 focus:ring-green-700 focus:outline-none"
                      />
                      <input
                        value={gradeForm.grade_description}
                        onChange={(e) =>
                          setGradeForm((f) => ({ ...f, grade_description: e.target.value }))
                        }
                        placeholder="Deskripsi (opsional)"
                        className="w-40 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:ring-1 focus:ring-green-700 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: '#1a472a' }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingGrade(null)}
                        className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-400"
                      >
                        ×
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingGrade(item.id)
                        setGradeForm({ grade_code: '', grade_description: '' })
                      }}
                      className="flex items-center gap-1 rounded-lg border border-dashed border-green-200 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50"
                    >
                      <Plus className="h-3 w-3" /> Grade
                    </button>
                  )}
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )}
          </div>
        )
      })}

      {addingItem ? (
        <form
          onSubmit={addItem}
          className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-gray-700">Rempah Baru</h3>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['Nama (ID) *', 'name', 'Cengkeh'],
                ['Nama (EN)', 'name_en', 'Clove'],
                ['Satuan', 'unit', 'kg'],
                ['HS Code', 'hs_code', '0907'],
              ] as const
            ).map(([label, field, ph]) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
                <input
                  value={itemForm[field]}
                  onChange={(e) => setItemForm((f) => ({ ...f, [field]: e.target.value }))}
                  placeholder={ph}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-green-700 focus:outline-none"
                />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddingItem(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: '#1a472a' }}
            >
              {saving ? '...' : 'Tambah'}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAddingItem(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-green-200 py-3 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          <Plus className="h-4 w-4" /> Tambah Rempah
        </button>
      )}
    </div>
  )
}
