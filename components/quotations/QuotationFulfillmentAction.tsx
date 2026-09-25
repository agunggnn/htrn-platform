'use client'

import { useState } from 'react'
import { Truck } from 'lucide-react'
import { MasParminFulfillmentModal } from './MasParminFulfillmentModal'

export type QuotationFulfillmentActionProps = {
  quotationId: string
  quotationNumber?: string
  buyerCompany: string
  buyerPic?: string
  buyerPhone?: string
  buyerAddress?: string
  totalQuantityKg?: number
  unitPricePerKg?: number
}

export function QuotationFulfillmentAction({
  quotationId,
  quotationNumber,
  buyerCompany,
  buyerPic,
  buyerPhone,
  buyerAddress,
  totalQuantityKg = 500,
  unitPricePerKg = 155000,
}: QuotationFulfillmentActionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-white shadow-2xs transition-all hover:opacity-95 cursor-pointer"
        style={{ backgroundColor: '#1a472a' }}
        title="Buka instruksi maklon dan cetak Surat Jalan resmi ke Mas Parmin Bogor"
      >
        <Truck className="h-4 w-4 text-emerald-300" />
        Fulfillment Mas Parmin
      </button>

      <MasParminFulfillmentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        quotationId={quotationId}
        quotationNumber={quotationNumber}
        buyerCompany={buyerCompany}
        buyerPic={buyerPic}
        buyerPhone={buyerPhone}
        buyerAddress={buyerAddress}
        initialQuantityKg={totalQuantityKg}
        initialPricePerKg={unitPricePerKg}
      />
    </>
  )
}
