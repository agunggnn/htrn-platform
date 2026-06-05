import { createClient } from '@/lib/supabase/server'

export default async function NumberingPage() {
  const supabase = await createClient()

  const [{ count: quoCount }, { count: invCount }, { count: poCount }] = await Promise.all([
    supabase.from('quotations').select('*', { count: 'exact', head: true }).not('quo_number', 'is', null),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).not('inv_number', 'is', null),
    supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).not('po_number', 'is', null),
  ])

  const now = new Date()
  const ym = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`

  const sequences = [
    { label: 'Quotation', prefix: 'QUO', count: quoCount ?? 0, example: `QUO/${ym}/001` },
    { label: 'Invoice', prefix: 'INV', count: invCount ?? 0, example: `INV/${ym}/001` },
    { label: 'Purchase Order', prefix: 'PO', count: poCount ?? 0, example: `PO/${ym}/001` },
  ]

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Penomoran Dokumen</h1>
        <p className="text-sm text-gray-500 mt-0.5">Format dan urutan nomor dokumen</p>
      </div>

      <div className="space-y-4">
        {sequences.map(({ label, prefix, count, example }) => (
          <div key={prefix} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{label}</p>
                <p className="text-sm text-gray-500 mt-0.5">Format: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{example}</code></p>
                <p className="text-xs text-gray-400 mt-1">{count} dokumen dibuat</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-400 mb-1">Prefix</p>
                <span className="px-3 py-1 text-sm font-mono font-bold text-green-800 bg-green-50 rounded-lg">{prefix}</span>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-medium text-gray-500 mb-2">Informasi</p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Format: <code className="bg-white px-1 rounded">[PREFIX]/[YYYY]/[MM]/[SEQ]</code></li>
            <li>• Sequence di-generate otomatis oleh database (PostgreSQL sequence)</li>
            <li>• Nomor tidak reset per bulan — berurutan terus</li>
            <li>• Untuk reset sequence, hubungi administrator database</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
