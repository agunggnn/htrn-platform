import { createClient } from '@/lib/supabase/server'
import { QuotationBuilder } from '@/components/quotations/QuotationBuilder'

type Props = { searchParams: Promise<{ buyer?: string }> }

export default async function NewQuotationPage({ searchParams }: Props) {
  const { buyer } = await searchParams
  const supabase = await createClient()

  const [{ data: buyers }, { data: items }, { data: grades }, { data: signatories }] =
    await Promise.all([
      supabase.from('buyers').select('*').eq('is_active', true).order('company_name'),
      supabase.from('items').select('*').eq('is_active', true).order('name'),
      supabase.from('item_grades').select('*').eq('is_active', true),
      supabase.from('signatories').select('*'),
    ])

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotation Baru</h1>
        <p className="text-sm text-gray-500 mt-0.5">Buat penawaran harga untuk buyer</p>
      </div>
      <QuotationBuilder
        buyers={buyers ?? []}
        items={items ?? []}
        grades={grades ?? []}
        signatories={signatories ?? []}
        defaultBuyerId={buyer}
      />
    </div>
  )
}
