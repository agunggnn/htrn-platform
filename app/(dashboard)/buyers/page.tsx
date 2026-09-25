import { createClient } from '@/lib/supabase/server'
import { BuyerPipelineBoard } from '@/components/buyers/BuyerPipelineBoard'
import { BuyerTableView } from '@/components/buyers/BuyerTableView'
import { BuyerHeaderControls } from '@/components/buyers/BuyerHeaderControls'
import type { Buyer } from '@/types'

type Props = {
  searchParams: Promise<{ q?: string; country?: string; view?: string }>
}

// Safety cap: kanban + grouped table need the full filtered set to be
// correct, so this page intentionally does not paginate. The cap keeps one
// bad filter from dumping tens of thousands of rows into the browser;
// when it hits, the header says so instead of silently dropping leads.
const FETCH_LIMIT = 1000

export default async function BuyersPage({ searchParams }: Props) {
  const { q, country, view = 'pipeline' } = await searchParams
  const isPipelineView = view !== 'table'
  const isFiltered = Boolean(q || country)

  const supabase = await createClient()

  let query = supabase
    .from('buyers')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('company_name', { ascending: true })
    .limit(FETCH_LIMIT)

  if (q) query = query.ilike('company_name', `%${q}%`)
  if (country) query = query.eq('country', country)

  const [{ data: rawBuyers, count: filteredCount }, { count: totalActive }] = await Promise.all([
    query,
    supabase.from('buyers').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])
  const buyers = (rawBuyers as Buyer[]) ?? []
  const matched = filteredCount ?? buyers.length
  const truncated = matched > buyers.length

  const headline = isFiltered
    ? `${matched} buyer cocok dengan filter, dari ${totalActive ?? '—'} buyer aktif terdaftar`
    : `${totalActive ?? buyers.length} buyer aktif terdaftar`

  return (
    <div className="px-6 py-8 lg:px-8 max-w-[1600px] mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isPipelineView ? 'Buyers & Sales Pipeline' : 'Buyers Directory & Spreadsheet'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5" data-slot="figure">
            {headline}
          </p>
          {truncated && (
            <p className="text-xs text-amber-700 mt-1">
              Menampilkan {buyers.length} pertama dari {matched} hasil — persempit dengan
              pencarian atau filter negara agar semua prospek terlihat.
            </p>
          )}
        </div>

        {/* Header Controls: View Switcher, Import CSV, Export CSV, Tambah Prospek */}
        <BuyerHeaderControls
          view={isPipelineView ? 'pipeline' : 'table'}
          q={q}
          country={country}
        />
      </div>

      {/* Render Selected View */}
      {isPipelineView ? (
        <BuyerPipelineBoard initialBuyers={buyers} />
      ) : (
        <BuyerTableView initialBuyers={buyers} />
      )}
    </div>
  )
}
