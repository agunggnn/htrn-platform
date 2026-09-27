import { Target } from 'lucide-react'
import { MarketingStrategyHub } from '@/components/marketing/MarketingStrategyHub'

export const metadata = {
  title: 'Strategi Marketing & Sales Playbook | HTRN Platform',
  description: 'Battlecard persona buyer, kalkulator ROI anti-oplosan, dan generator pesan WhatsApp B2B teruji.',
}

export default function MarketingPage() {
  return (
    <div className="px-6 py-8 lg:px-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Target className="h-7 w-7 text-[#1a472a]" />
            Strategi Marketing & Sales Playbook B2B
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-3xl">
            Amunisi komersial terkurasi untuk penetrasi pasar rempah Bawang Merah Goreng Brebes: Persona Battlecards,
            kalkulator edukasi ROI anti-oplosan tepung, dan generator script pesan WhatsApp dengan penanganan keberatan koki.
          </p>
        </div>
      </div>

      {/* Main Hub */}
      <MarketingStrategyHub />
    </div>
  )
}
