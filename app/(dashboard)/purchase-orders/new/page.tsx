import { createClient } from '@/lib/supabase/server'
import { POForm } from '@/components/purchase-orders/POForm'

type Props = { searchParams: Promise<{ quo?: string }> }

export default async function NewPOPage({ searchParams }: Props) {
  const { quo } = await searchParams
  const supabase = await createClient()

  const [{ data: suppliers }, { data: items }, { data: grades }, { data: quotations }] =
    await Promise.all([
      supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
      supabase.from('items').select('*').eq('is_active', true).order('name'),
      supabase.from('item_grades').select('*').eq('is_active', true),
      supabase.from('quotations').select('*, buyers(company_name)').eq('status', 'accepted').order('created_at', { ascending: false }),
    ])

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Order Baru</h1>
        <p className="text-sm text-gray-500 mt-0.5">Order barang ke supplier / petani</p>
      </div>
      <POForm
        suppliers={suppliers ?? []}
        items={items ?? []}
        grades={grades ?? []}
        quotations={quotations ?? []}
        defaultQuoId={quo}
      />
    </div>
  )
}
