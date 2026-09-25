'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type MonthlyRevenue = {
  month: string
  paid: number
  outstanding: number
}

type RevenueChartProps = {
  data: MonthlyRevenue[]
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatYAxis = (value: number) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`
  }
  return `$${value}`
}

export function RevenueChart({ data }: RevenueChartProps) {
  // Client-only via RevenueChartLazy (next/dynamic ssr:false), so
  // ResponsiveContainer always measures a mounted layout. No mount guard.
  return (
    <div className="bg-card border-border rounded-2xl border p-6">
      <h3 className="text-eyebrow text-muted-foreground">Revenue Overview</h3>
      <p className="text-muted-foreground mt-1 mb-5 text-xs">
        Lunas vs belum dibayar, 6 bulan terakhir dari data invoice.
      </p>
      
      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1a472a" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#1a472a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c9a227" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#c9a227" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={formatYAxis}
              dx={-10}
            />
            <Tooltip
              contentStyle={{ 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value) => formatCurrency(Number(value ?? 0))}
            />
            <Legend 
              iconType="circle" 
              wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
            />
            <Area
              type="monotone"
              dataKey="paid"
              name="Paid"
              stroke="#1a472a"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPaid)"
              activeDot={{ r: 6, fill: '#1a472a' }}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="outstanding"
              name="Outstanding"
              stroke="#c9a227"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOutstanding)"
              activeDot={{ r: 6, fill: '#c9a227' }}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
