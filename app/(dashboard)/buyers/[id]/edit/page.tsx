import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BuyerForm } from '@/components/buyers/BuyerForm'

type Props = { params: Promise<{ id: string }> }

export default async function EditBuyerPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: buyer } = await supabase.from('buyers').select('*').eq('id', id).single()
  if (!buyer) notFound()

  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Buyer</h1>
        <p className="text-sm text-gray-500 mt-0.5">{buyer.company_name}</p>
      </div>
      <BuyerForm buyer={buyer} />
    </div>
  )
}
