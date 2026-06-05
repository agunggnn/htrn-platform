import { BuyerForm } from '@/components/buyers/BuyerForm'

export default function NewBuyerPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tambah Buyer</h1>
        <p className="text-sm text-gray-500 mt-0.5">Data buyer internasional baru</p>
      </div>
      <BuyerForm />
    </div>
  )
}
