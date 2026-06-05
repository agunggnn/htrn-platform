'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

type DataPoint = { date: string; [grade: string]: number | string }

const GRADE_COLORS: Record<string, string> = {
  Super: '#1a472a',
  A: '#c9a227',
  B: '#2563eb',
  FAQ: '#7c3aed',
  C: '#dc2626',
}

function colorForGrade(grade: string, idx: number) {
  return GRADE_COLORS[grade] ?? ['#1a472a', '#c9a227', '#2563eb', '#7c3aed', '#dc2626'][idx % 5]
}

export function PriceSparkline({ data, grade }: { data: DataPoint[]; grade: string }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey={grade}
          stroke={colorForGrade(grade, 0)}
          dot={false}
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function PriceDetailChart({
  data,
  grades,
}: {
  data: DataPoint[]
  grades: string[]
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
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
            typeof value === 'number' ? new Intl.NumberFormat('id-ID').format(value) : value,
            `Grade ${name}`,
          ]}
        />
        <Legend />
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
