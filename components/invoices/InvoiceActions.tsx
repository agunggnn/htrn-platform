'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { RecordPaymentModal } from './RecordPaymentModal'

type Props = { invoiceId: string; status: string; amountDue: number; currency: string }

export function InvoiceActions({ invoiceId, status, amountDue, currency }: Props) {
  const router = useRouter()
  const [showPayment, setShowPayment] = useState(false)

  async function updateStatus(newStatus: string) {
    const supabase = createClient()
    await supabase.from('invoices').update({ status: newStatus }).eq('id', invoiceId)
    router.refresh()
  }

  return (
    <>
      {status === 'draft' && (
        <button onClick={() => updateStatus('sent')}
          className="px-3 py-1.5 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50">
          Tandai Terkirim
        </button>
      )}
      {['sent', 'partial', 'overdue'].includes(status) && amountDue > 0 && (
        <button onClick={() => setShowPayment(true)}
          className="px-3 py-1.5 text-sm font-semibold text-white rounded-lg"
          style={{ backgroundColor: '#1a472a' }}>
          Catat Pembayaran
        </button>
      )}
      {showPayment && (
        <RecordPaymentModal
          invoiceId={invoiceId}
          amountDue={amountDue}
          currency={currency}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  )
}
