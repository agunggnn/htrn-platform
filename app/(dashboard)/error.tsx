'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: Props) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <div className="bg-destructive/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="font-display text-foreground text-xl font-semibold">
        Halaman gagal dimuat
      </h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        Terjadi kendala saat mengambil data dari sistem. Periksa koneksi internet
        Anda, lalu coba lagi. Jika berlanjut, hubungi admin.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Coba lagi
        </button>
        <a
          href="/"
          className="border-border bg-card text-foreground hover:bg-muted rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
        >
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  )
}
