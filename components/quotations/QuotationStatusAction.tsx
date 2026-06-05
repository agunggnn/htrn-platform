'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle } from 'lucide-react'

type Props = { id: string; status: string }

export function QuotationStatusAction({ id, status }: Props) {
  const router = useRouter()

  async function update(newStatus: string) {
    const supabase = createClient()
    await supabase.from('quotations').update({ status: newStatus }).eq('id', id)
    router.refresh()
  }

  if (status === 'sent') return (
    <div className="flex gap-2">
      <button onClick={() => update('accepted')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50">
        <CheckCircle className="w-4 h-4" /> Diterima
      </button>
      <button onClick={() => update('rejected')}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
        <XCircle className="w-4 h-4" /> Ditolak
      </button>
    </div>
  )

  if (status === 'accepted') return (
    <a href={`/invoices/new?from=${id}`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white rounded-lg"
      style={{ backgroundColor: '#1a472a' }}>
      Buat Invoice →
    </a>
  )

  if (status === 'draft') return (
    <button onClick={() => update('sent')}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50">
      Tandai Terkirim
    </button>
  )

  return null
}
