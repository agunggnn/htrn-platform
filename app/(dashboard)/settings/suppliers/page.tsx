import { createClient } from '@/lib/supabase/server'
import { SuppliersManager } from '@/components/settings/SuppliersManager'

export default async function SuppliersSettingsPage() {
  const supabase = await createClient()
  const { data: suppliers } = await supabase.from('suppliers').select('*').order('name')

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Supplier</h1>
        <p className="text-sm text-gray-500 mt-0.5">Data supplier dan petani rempah</p>
      </div>
      <SuppliersManager suppliers={suppliers ?? []} />
    </div>
  )
}
