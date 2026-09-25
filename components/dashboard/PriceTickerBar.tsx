'use client'

import React from 'react'

export type PriceTick = {
  itemName: string
  gradeCode: string
  todayPrice: number
  yesterdayPrice: number
}

export type PriceTickerBarProps = {
  ticks: PriceTick[]
}

export default function PriceTickerBar({ ticks }: PriceTickerBarProps) {
  if (!ticks || ticks.length === 0) {
    return (
      <div className="bg-card border-border flex w-full items-center rounded-2xl border px-5 py-3">
        <span className="text-eyebrow text-muted-foreground mr-4 shrink-0">Harga Hari Ini</span>
        <div className="text-muted-foreground text-sm italic">Belum ada data harga hari ini</div>
      </div>
    )
  }

  return (
    <div className="bg-card border-border flex w-full items-center overflow-hidden rounded-2xl border px-5 py-3">
      <span className="text-eyebrow text-muted-foreground bg-card border-border z-10 mr-4 shrink-0 border-r pr-2">
        Harga Hari Ini
      </span>
      <div
        className="relative flex flex-1 items-center overflow-hidden"
        role="region"
        aria-label="Harga rempah hari ini dibanding kemarin"
      >
        <div className="animate-ticker flex w-max gap-8 pl-4">
          {[...ticks, ...ticks].map((tick, index) => {
            const { itemName, gradeCode, todayPrice, yesterdayPrice } = tick
            let changeLabel = '—'
            let changeColor = 'text-gray-400'
            let pct = ''

            if (yesterdayPrice > 0) {
              const diff = todayPrice - yesterdayPrice
              const pctValue = (diff / yesterdayPrice) * 100
              pct = Math.abs(pctValue).toFixed(1) + '%'
              
              if (diff > 0) {
                changeLabel = '▲'
                changeColor = 'text-green-600'
              } else if (diff < 0) {
                changeLabel = '▼'
                changeColor = 'text-red-600'
              }
            }

            const formattedPrice = new Intl.NumberFormat('id-ID').format(todayPrice)

            return (
              <div key={index} className="flex shrink-0 items-center gap-2 whitespace-nowrap" aria-hidden={index >= ticks.length}>
                <span className="text-foreground text-sm font-semibold">
                  {itemName} {gradeCode}
                </span>
                <span className="text-muted-foreground text-sm" data-slot="figure">Rp {formattedPrice}</span>
                <span className={`text-xs font-medium flex items-center gap-1 ${changeColor}`}>
                  {changeLabel} {pct}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
