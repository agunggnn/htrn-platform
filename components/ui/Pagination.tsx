import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  currentPage: number
  totalPages: number
  baseUrl: string
  searchParams?: Record<string, string | undefined>
}

export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  searchParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams()
    Object.entries(searchParams).forEach(([key, val]) => {
      if (val && key !== 'page') params.set(key, val)
    })
    params.set('page', page.toString())
    return `${baseUrl}?${params.toString()}`
  }

  const prevPage = currentPage > 1 ? currentPage - 1 : 1
  const nextPage = currentPage < totalPages ? currentPage + 1 : totalPages

  return (
    <div className="flex items-center justify-between pt-4 pb-2 border-t border-gray-100 px-4 text-sm">
      <p className="text-xs text-gray-500">
        Halaman <span className="font-semibold text-gray-900">{currentPage}</span> dari{' '}
        <span className="font-semibold text-gray-900">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1.5">
        <Link
          href={createPageUrl(prevPage)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium transition-colors ${
            currentPage <= 1
              ? 'opacity-40 pointer-events-none text-gray-400 bg-gray-50'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </Link>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(
            (p) =>
              p === 1 ||
              p === totalPages ||
              Math.abs(p - currentPage) <= 1
          )
          .map((p, idx, arr) => {
            const showEllipsis = idx > 0 && p - arr[idx - 1] > 1
            return (
              <div key={p} className="flex items-center">
                {showEllipsis && <span className="px-1 text-gray-400 text-xs">...</span>}
                <Link
                  href={createPageUrl(p)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    currentPage === p
                      ? 'text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  style={currentPage === p ? { backgroundColor: '#1a472a' } : {}}
                >
                  {p}
                </Link>
              </div>
            )
          })}

        <Link
          href={createPageUrl(nextPage)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium transition-colors ${
            currentPage >= totalPages
              ? 'opacity-40 pointer-events-none text-gray-400 bg-gray-50'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
