import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
      aria-busy="true"
      aria-label="Memuat data dashboard"
    >
      <div className="mb-6">
        <Skeleton className="mb-2 h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      <Skeleton className="mb-6 h-14 w-full" />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['a', 'b', 'c', 'd'].map((k) => (
          <div key={k} className="bg-card border-border rounded-2xl border p-5">
            <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="mb-1 h-7 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <Skeleton className="mb-6 h-44 w-full" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Skeleton className="h-72 w-full xl:col-span-2" />
        <Skeleton className="h-72 w-full" />
      </div>

      <p className="text-muted-foreground mt-6 text-center text-xs">
        Memuat data terbaru dari sistem...
      </p>
    </div>
  )
}
