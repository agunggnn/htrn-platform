'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type DataPoint = { date: string; [grade: string]: number | string }

const GRADE_COLORS: Record<string, string> = {
  Super: '#1a472a',
  A: '#c9a227',
  B: '#2563eb',
  FAQ: '#7c3aed',
  C: '#dc2626',
  GRADE_A_SLICE: '#1a472a',
  GRADE_B_CRUSHED: '#d97706',
  GRADE_POWDER: '#2563eb',
}

function formatGradeLabel(name: unknown): string {
  const code = String(name ?? '')
  if (code === 'GRADE_A_SLICE') return 'Slice Renyah (Gr A)'
  if (code === 'GRADE_B_CRUSHED') return 'Giling Kasar (Gr B)'
  if (code === 'GRADE_POWDER') return 'Bubuk Halus'
  return `Grade ${code}`
}

function colorForGrade(grade: string, idx: number) {
  return GRADE_COLORS[grade] ?? ['#1a472a', '#c9a227', '#2563eb', '#7c3aed', '#dc2626'][idx % 5]
}

export function PriceSparkline({ data, grade }: { data: DataPoint[]; grade: string }) {
  if (!data || data.length === 0) {
    return <div className="h-10 w-16" />
  }

  return (
    <LineChart width={64} height={40} data={data}>
      <Line
        type="monotone"
        dataKey={grade}
        stroke={colorForGrade(grade, 0)}
        dot={false}
        strokeWidth={1.5}
        isAnimationActive={false}
      />
    </LineChart>
  )
}

export function PriceDetailChart({
  data,
  grades,
}: {
  data: DataPoint[]
  grades: string[]
}) {
  // Client-only via PriceDetailChartLazy (next/dynamic ssr:false), so
  // ResponsiveContainer always measures a mounted layout. No mount guard.
  return (
    <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={0}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value, name) => [
            typeof value === 'number' ? `Rp ${new Intl.NumberFormat('id-ID').format(value)}` : value,
            formatGradeLabel(name),
          ]}
        />
        <Legend formatter={(value) => formatGradeLabel(value)} />
        {grades.map((grade, idx) => (
          <Line
            key={grade}
            type="monotone"
            dataKey={grade}
            stroke={colorForGrade(grade, idx)}
            dot={false}
            strokeWidth={2}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
