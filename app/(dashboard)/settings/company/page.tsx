import { createClient } from '@/lib/supabase/server'
import { CompanyForm } from '@/components/settings/CompanyForm'

export default async function CompanySettingsPage() {
  const supabase = await createClient()
  const { data: company } = await supabase.from('company_profile').select('*').limit(1).single()

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profil Perusahaan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Informasi yang tampil di kop surat dokumen</p>
      </div>
      <CompanyForm company={company} />
    </div>
  )
}
