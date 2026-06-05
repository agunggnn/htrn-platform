import { createClient } from '@/lib/supabase/server'
import { ItemsCatalog } from '@/components/settings/ItemsCatalog'

export default async function ItemsSettingsPage() {
  const supabase = await createClient()
  const [{ data: items }, { data: grades }] = await Promise.all([
    supabase.from('items').select('*').order('name'),
    supabase.from('item_grades').select('*'),
  ])

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Katalog Rempah</h1>
        <p className="text-sm text-gray-500 mt-0.5">Item dan grade yang tersedia untuk quotation dan invoice</p>
      </div>
      <ItemsCatalog items={items ?? []} grades={grades ?? []} />
    </div>
  )
}
