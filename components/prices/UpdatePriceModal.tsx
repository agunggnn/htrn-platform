'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertCircle, Sparkles, Building2, Tag, Calendar } from 'lucide-react'
import type { Item, ItemGrade, Supplier } from '@/types'

type Props = {
  item: Item
  grades: ItemGrade[]
  suppliers: Supplier[]
  initialPrices?: Record<string, number | null>
  onClose: () => void
}

function formatRupiahInput(val: string): string {
  const digits = val.replace(/\D/g, '')
  if (!digits) return ''
  return new Intl.NumberFormat('id-ID').format(parseInt(digits, 10))
}

function parseRupiahNumber(val: string): number {
  const digits = val.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
}

function getGradeMeta(gradeCode: string) {
  switch (gradeCode) {
    case 'GRADE_A_SLICE':
      return {
        title: 'Slice Renyah Keemasan',
        badge: 'Grade A · HORECA',
        sub: 'Flakes utuh renyah, topping resto & katering',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      }
    case 'GRADE_B_CRUSHED':
      return {
        title: 'Giling Kasar (Crushed)',
        badge: 'Grade B · Industri',
        sub: 'Bumbu olahan, sambal kemasan & seasoning',
        badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      }
    case 'GRADE_POWDER':
      return {
        title: 'Bubuk Halus (Powder)',
        badge: 'Mesh 60-80 · Premix',
        sub: 'Bumbu kuah, premix kaldu & savory powder',
        badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
      }
    case 'Super':
      return {
        title: 'Grade Super',
        badge: 'Ekspor Pilihan',
        sub: 'Sortasi premium mutu ekspor internasional',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      }
    case 'A':
      return {
        title: 'Grade A',
        badge: 'Standar Industri Utama',
        sub: 'Kadar air & kemurnian standar industri',
        badgeColor: 'bg-green-50 text-green-800 border-green-200',
      }
    case 'B':
      return {
        title: 'Grade B',
        badge: 'Standar Komersial',
        sub: 'Pasar domestik & pengolahan bumbu dasar',
        badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
      }
    case 'FAQ':
      return {
        title: 'Grade FAQ',
        badge: 'Fair Average Quality',
        sub: 'Mutu standar pasar terbuka',
        badgeColor: 'bg-orange-50 text-orange-800 border-orange-200',
      }
    default:
      return {
        title: `Grade ${gradeCode}`,
        badge: gradeCode,
        sub: 'Spesifikasi standar mutu',
        badgeColor: 'bg-gray-50 text-gray-700 border-gray-200',
      }
  }
}

export function UpdatePriceModal({ item, grades, suppliers, initialPrices = {}, onClose }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)

  const isBawangGoreng = item.name.toLowerCase().includes('bawang')

  // Default source type: selling_tier_1 for Bawang Goreng, market for general spices
  const [sourceType, setSourceType] = useState(isBawangGoreng ? 'selling_tier_1' : 'market')

  // Auto-select Mas Parmin if supplier source is chosen and item is Bawang Goreng
  const defaultSupplier = useMemo(() => {
    const masParmin = suppliers.find((s) => s.name.toLowerCase().includes('daun mas') || s.name.toLowerCase().includes('panca mas') || s.name.toLowerCase().includes('parmin'))
    return masParmin ? masParmin.id : suppliers[0]?.id ?? ''
  }, [suppliers])

  const [supplierId, setSupplierId] = useState(defaultSupplier)

  // Initialize prices with formatted initial numbers
  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    grades.forEach((g) => {
      const existing = initialPrices[g.grade_code]
      if (existing && existing > 0) {
        init[g.grade_code] = new Intl.NumberFormat('id-ID').format(existing)
      } else {
        init[g.grade_code] = ''
      }
    })
    return init
  })

  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function handlePriceChange(gradeCode: string, rawVal: string) {
    const formatted = formatRupiahInput(rawVal)
    setPrices((prev) => ({ ...prev, [gradeCode]: formatted }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')

    // Prepare payload
    const pricePayload: { grade_code: string; price: number }[] = []
    for (const g of grades) {
      const val = prices[g.grade_code]
      const num = parseRupiahNumber(val || '')
      if (num > 0) {
        pricePayload.push({ grade_code: g.grade_code, price: num })
      }
    }

    if (pricePayload.length === 0) {
      setError('Harap isi nominal harga minimal pada satu grade.')
      setSaving(false)
      return
    }

    try {
      const res = await fetch('/api/prices/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          date,
          source_type: sourceType,
          supplier_id: sourceType === 'supplier' ? supplierId : null,
          prices: pricePayload,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan update harga')
      }

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kendala saat memperbarui harga')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-green-900 text-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={44}
                  height={44}
                  loading="lazy"
                  className="w-11 h-11 rounded-xl object-cover border border-white/20 bg-white/10 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-sm text-emerald-200 shrink-0">
                  {item.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">{item.name}</h2>
                  <span className="text-[10px] bg-white/20 text-emerald-100 px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">
                    {item.unit || 'kg'}
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  {item.name_en || 'Update & Sinkronisasi Harga Harian'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-white/60 hover:text-white text-2xl leading-none p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Tanggal Harga
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 transition-all font-medium text-gray-800"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                Kategori / Sumber
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700 transition-all font-medium text-gray-800 bg-white"
              >
                {isBawangGoreng ? (
                  <>
                    <option value="selling_tier_1">Harga Jual: Tier 1 HORECA (100–499 kg)</option>
                    <option value="selling_tier_2">Harga Jual: Tier 2 Katering (500–999 kg)</option>
                    <option value="supplier">HPP Modal Supplier (CV Daun Mas)</option>
                    <option value="market">Pasar / Benchmark Bebas</option>
                    <option value="contract">Kontrak Khusus Buyer</option>
                  </>
                ) : (
                  <>
                    <option value="market">Pasar Spot / Benchmark</option>
                    <option value="supplier">Supplier / Petani Mitra</option>
                    <option value="contract">Kontrak Forward</option>
                    <option value="selling_tier_1">Harga Jual Komersial</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Supplier selector if supplier source */}
          {sourceType === 'supplier' && suppliers.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 animate-in fade-in duration-100">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                Pilih Supplier Mitra
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white font-medium text-gray-800"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.region ? `(${s.region})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-700 mt-1">
                Dicatat sebagai HPP modal beli netto (locco gudang supplier).
              </p>
            </div>
          )}

          {/* Grade Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Nominal Harga per Grade (IDR/{item.unit || 'kg'})
              </label>
              <span className="text-[11px] text-gray-400 font-medium">Bisa diisi sebagian</span>
            </div>

            <div className="space-y-3">
              {grades.map((g) => {
                const meta = getGradeMeta(g.grade_code)
                const val = prices[g.grade_code] ?? ''
                return (
                  <div
                    key={g.grade_code}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-gray-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all bg-gray-50/40"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {meta.title}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeColor} shrink-0`}
                        >
                          {meta.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                        {meta.sub}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 sm:w-48 shrink-0">
                      <span className="text-xs font-semibold text-gray-500 shrink-0">Rp</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={val}
                        onChange={(e) => handlePriceChange(g.grade_code, e.target.value)}
                        className="w-full px-3 py-1.5 text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 text-right"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in zoom-in-95 duration-100">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Harga berhasil diperbarui & grafik tersinkronisasi!</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || success}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1a472a' }}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tersimpan</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
