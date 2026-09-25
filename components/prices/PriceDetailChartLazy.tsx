'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/Skeleton'

// recharts ships on demand, not in the detail page's initial JS.
export const PriceDetailChartLazy = dynamic(
  () => import('./PriceChart').then((m) => ({ default: m.PriceDetailChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[300px] w-full" />,
  }
)
