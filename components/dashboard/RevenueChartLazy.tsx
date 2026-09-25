'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Skeleton'

// recharts ships on demand, not in the dashboard's initial JS. Client-only
// render also guarantees ResponsiveContainer measures a mounted layout.
export const RevenueChartLazy = dynamic(
  () => import('./RevenueChart').then((m) => ({ default: m.RevenueChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full" />,
  }
)
