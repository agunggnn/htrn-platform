'use client'

import { useState } from 'react'
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

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <Link href={`/prices/${item.id}`} className="text-base font-semibold text-gray-900 hover:text-green-800">
              {item.name}
            </Link>
            {item.name_en && <p className="text-xs text-gray-400">{item.name_en}</p>}
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
                  <span className="w-14 text-xs font-medium text-gray-500">Gr {row.grade_code}</span>
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
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
