'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { PriceSparkline } from './PriceChart'
import { UpdatePriceModal } from './UpdatePriceModal'
import type { Item, ItemGrade, Supplier } from '@/types'

type PriceRow = {
  grade_code: string
  today: number | null
  yesterday: number | null
  sparkline: { date: string; [k: string]: number | string }[]
}

type Props = {
  item: Item
  grades: ItemGrade[]
  priceRows: PriceRow[]
  suppliers: Supplier[]
}

function pctChange(today: number | null, yesterday: number | null) {
  if (!today || !yesterday) return null
  return ((today - yesterday) / yesterday) * 100
}

export function ItemPriceCard({ item, grades, priceRows, suppliers }: Props) {
  const [showModal, setShowModal] = useState(false)

  const initialPrices = useMemo(() => {
    const map: Record<string, number | null> = {}
    priceRows.forEach((r) => {
      map[r.grade_code] = r.today ?? r.yesterday ?? null
    })
    return map
  }, [priceRows])

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt={item.name}
                width={48}
                height={48}
                loading="lazy"
                className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 font-bold text-sm shrink-0">
                {item.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <Link href={`/prices/${item.id}`} className="text-base font-semibold text-gray-900 hover:text-green-800">
                  {item.name}
                </Link>
                {item.name === 'Bawang Merah Goreng' && (
                  <Link
                    href="/api/pdf/spec-sheet/bawang-goreng"
                    target="_blank"
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                    title="Buka / Cetak Technical Data Sheet (TDS)"
                  >
                    TDS Spek ↗
                  </Link>
                )}
              </div>
              {item.name_en && <p className="text-xs text-gray-400">{item.name_en}</p>}
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: '#1a472a' }}
          >
            Update
          </button>
        </div>

        {/* Price table */}
        {priceRows.length > 0 ? (
          <div className="space-y-2">
            {priceRows.map((row) => {
              const pct = pctChange(row.today, row.yesterday)
              return (
                <div key={row.grade_code} className="flex items-center gap-2">
                  <span className="min-w-[95px] max-w-[130px] text-xs font-medium text-gray-600 truncate" title={row.grade_code}>
                    {row.grade_code === 'GRADE_A_SLICE'
                      ? 'Slice (Renyah)'
                      : row.grade_code === 'GRADE_B_CRUSHED'
                      ? 'Giling Kasar'
                      : row.grade_code === 'GRADE_POWDER'
                      ? 'Bubuk Halus'
                      : `Gr ${row.grade_code}`}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-gray-900">
                    {row.today
                      ? `Rp ${new Intl.NumberFormat('id-ID').format(row.today)}`
                      : <span className="text-gray-300 font-normal">—</span>}
                  </span>
                  {pct !== null && (
                    <span className={`flex items-center gap-0.5 text-xs font-medium ${pct > 0 ? 'text-green-600' : pct < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {pct > 0 ? <TrendingUp className="w-3 h-3" /> : pct < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {Math.abs(pct).toFixed(1)}%
                    </span>
                  )}
                  {/* Sparkline */}
                  <div className="w-16">
                    <PriceSparkline data={row.sparkline} grade={row.grade_code} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-2">Belum ada data harga</p>
        )}
      </div>

      {showModal && (
        <UpdatePriceModal
          item={item}
          grades={grades}
          suppliers={suppliers}
          initialPrices={initialPrices}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
