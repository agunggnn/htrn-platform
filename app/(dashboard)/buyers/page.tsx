import { createClient } from '@/lib/supabase/server'
import { BuyerPipelineBoard } from '@/components/buyers/BuyerPipelineBoard'
import { BuyerTableView } from '@/components/buyers/BuyerTableView'
import { BuyerHeaderControls } from '@/components/buyers/BuyerHeaderControls'
import type { Buyer } from '@/types'

type Props = {
  searchParams: Promise<{ q?: string; country?: string; page?: string; view?: string }>
}

export default async function BuyersPage({ searchParams }: Props) {
  const { q, country, view = 'pipeline' } = await searchParams
  const isPipelineView = view !== 'table'

  const supabase = await createClient()

  let query = supabase
    .from('buyers')
    .select('*')
    .eq('is_active', true)
    .order('company_name', { ascending: true })

  if (q) query = query.ilike('company_name', `%${q}%`)
  if (country) query = query.eq('country', country)

  const { data: rawBuyers } = await query
  const buyers = (rawBuyers as Buyer[]) ?? []

  return (
    <div className="px-6 py-8 lg:px-8 max-w-[1600px] mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isPipelineView ? 'Buyers & Sales Pipeline' : 'Buyers Directory & Spreadsheet'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {buyers.length} entitas prospek buyer terdaftar · Pusat komando operasional B2B Haturan
          </p>
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
