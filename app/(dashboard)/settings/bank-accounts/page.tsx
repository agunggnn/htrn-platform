import { createClient } from '@/lib/supabase/server'
import { BankAccountsManager } from '@/components/settings/BankAccountsManager'

export default async function BankAccountsPage() {
  const supabase = await createClient()
  const { data: accounts } = await supabase.from('bank_accounts').select('*').order('is_primary', { ascending: false })

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rekening Bank</h1>
        <p className="text-sm text-gray-500 mt-0.5">Rekening yang tampil di invoice untuk pembayaran</p>
      </div>
      <BankAccountsManager accounts={accounts ?? []} />
    </div>
  )
}
