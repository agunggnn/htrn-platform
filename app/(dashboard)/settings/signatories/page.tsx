import { createClient } from '@/lib/supabase/server'
import { SignatoriesManager } from '@/components/settings/SignatoriesManager'

export default async function SignatoriesPage() {
  const supabase = await createClient()
  const { data: signatories } = await supabase.from('signatories').select('*')

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Penandatangan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Nama, jabatan, dan tanda tangan digital untuk dokumen</p>
      </div>
      <SignatoriesManager signatories={signatories ?? []} />
    </div>
  )
}
