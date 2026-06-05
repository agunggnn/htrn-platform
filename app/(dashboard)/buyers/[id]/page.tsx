import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Globe, Edit } from 'lucide-react'
import { BuyerTabs } from '@/components/buyers/BuyerTabs'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }

export default async function BuyerDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab = 'overview' } = await searchParams
  const supabase = await createClient()

  const [{ data: buyer }, { data: quotations }, { data: invoices }] = await Promise.all([
    supabase.from('buyers').select('*').eq('id', id).single(),
    supabase.from('quotations').select('*').eq('buyer_id', id).order('created_at', { ascending: false }),
    supabase.from('invoices').select('*').eq('buyer_id', id).order('created_at', { ascending: false }),
  ])

  if (!buyer) notFound()

  const STATUS_COLOR: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-50 text-blue-700',
    accepted: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600',
    expired: 'bg-orange-50 text-orange-600',
    partial: 'bg-yellow-50 text-yellow-700',
    paid: 'bg-green-50 text-green-700',
    overdue: 'bg-red-50 text-red-600',
  }

  return (
    <div className="px-8 py-8">
      <Link href="/buyers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{buyer.company_name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {buyer.country && <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" />{buyer.country}</span>}
              {buyer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{buyer.email}</span>}
              {buyer.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{buyer.phone}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {buyer.source && (
              <span className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                {buyer.source}
              </span>
            )}
            <Link href={`/buyers/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Edit className="w-3.5 h-3.5" /> Edit
            </Link>
            <Link href={`/quotations/new?buyer=${id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: '#1a472a' }}>
              Buat Quotation
            </Link>
          </div>
        </div>
      </div>

      <BuyerTabs
        tab={tab}
        buyerId={id}
        buyer={buyer}
        quotations={quotations ?? []}
        invoices={invoices ?? []}
        statusColor={STATUS_COLOR}
      />
    </div>
  )
}
