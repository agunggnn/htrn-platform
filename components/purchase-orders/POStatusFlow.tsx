'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type POItem = { id: string; grade_code: string; quantity_ordered: number; unit: string; description?: string }
type Props = { poId: string; status: string; items: POItem[] }

export function POStatusFlow({ poId, status, items }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [received, setReceived] = useState<Record<string, string>>({})
  const [qualityRating, setQualityRating] = useState(5)
  const [onTime, setOnTime] = useState(true)

  async function updateStatus(newStatus: string) {
    setLoading(true)
    const supabase = createClient()
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'sent') updates.order_date = new Date().toISOString().split('T')[0]
    if (newStatus === 'received') updates.received_date = new Date().toISOString().split('T')[0]
    await supabase.from('purchase_orders').update(updates).eq('id', poId)
    setLoading(false)
    router.refresh()
  }

  async function handleReceive() {
    setLoading(true)
    const supabase = createClient()

    // Update received quantities
    await Promise.all(
      items.map((item) => {
        const qty = parseFloat(received[item.id] ?? String(item.quantity_ordered))
        return supabase.from('po_items').update({ quantity_received: qty }).eq('id', item.id)
      })
    )

    await supabase.from('purchase_orders').update({
      status: 'received',
      received_date: new Date().toISOString().split('T')[0],
    }).eq('id', poId)

    setLoading(false)
    setShowReceive(false)
    router.refresh()
  }

  if (status === 'draft') return (
    <div className="flex gap-2">
      <button onClick={() => updateStatus('sent')} disabled={loading}
        className="px-4 py-1.5 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-60">
        {loading ? '...' : 'Kirim ke Supplier'}
      </button>
      <button onClick={() => updateStatus('cancelled')} disabled={loading}
        className="px-4 py-1.5 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60">
        Batalkan
      </button>
    </div>
  )

  if (status === 'sent') return (
    <div className="flex gap-2">
      <button onClick={() => updateStatus('confirmed')} disabled={loading}
        className="px-4 py-1.5 text-sm font-medium text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-50 disabled:opacity-60">
        Supplier Konfirmasi
      </button>
      <button onClick={() => setShowReceive(true)}
        className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg"
        style={{ backgroundColor: '#1a472a' }}>
        Terima Barang
      </button>
      {showReceive && (
        <ReceiveModal
          items={items}
          received={received}
          qualityRating={qualityRating}
          onTime={onTime}
          onQtyChange={(id: string, v: string) => setReceived((r) => ({ ...r, [id]: v }))}
          onQualityChange={setQualityRating}
          onTimeChange={setOnTime}
          onSave={handleReceive}
          onClose={() => setShowReceive(false)}
          loading={loading}
        />
      )}
    </div>
  )

  if (status === 'confirmed') return (
    <div className="flex gap-2">
      <button onClick={() => setShowReceive(true)}
        className="px-4 py-1.5 text-sm font-semibold text-white rounded-lg"
        style={{ backgroundColor: '#1a472a' }}>
        Terima Barang
      </button>
      {showReceive && (
        <ReceiveModal
          items={items}
          received={received}
          qualityRating={qualityRating}
          onTime={onTime}
          onQtyChange={(id: string, v: string) => setReceived((r) => ({ ...r, [id]: v }))}
          onQualityChange={setQualityRating}
          onTimeChange={setOnTime}
          onSave={handleReceive}
          onClose={() => setShowReceive(false)}
          loading={loading}
        />
      )}
    </div>
  )

  return null
}

function ReceiveModal({ items, received, qualityRating, onTime, onQtyChange, onQualityChange, onTimeChange, onSave, onClose, loading }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Terima Barang</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Qty Diterima</p>
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 mb-2">
                <span className="flex-1 text-sm text-gray-700">Grade {item.grade_code}</span>
                <span className="text-xs text-gray-400">Order: {item.quantity_ordered} {item.unit}</span>
                <input
                  type="number"
                  defaultValue={item.quantity_ordered}
                  onChange={(e) => onQtyChange(item.id, e.target.value)}
                  className="w-24 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-700"
                />
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Rating Kualitas</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => onQualityChange(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-colors ${qualityRating >= n ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-400'}`}>
                  {n}
                </button>
              ))}
              <span className="text-xs text-gray-400 self-center ml-1">/ 5</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-gray-500">Tepat waktu?</p>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button key={String(v)} onClick={() => onTimeChange(v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${onTime === v ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400'}`}>
                  {v ? 'Ya' : 'Tidak'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Batal</button>
            <button onClick={onSave} disabled={loading}
              className="flex-1 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ backgroundColor: '#1a472a' }}>
              {loading ? 'Menyimpan...' : 'Konfirmasi Penerimaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
