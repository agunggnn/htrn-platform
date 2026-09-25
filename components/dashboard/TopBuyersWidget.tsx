import Link from 'next/link'

type TopBuyer = {
  id: string
  companyName: string
  country: string | null
  totalValue: number
  invoiceCount: number
  lastActivity: string
}

type TopBuyersWidgetProps = {
  buyers: TopBuyer[]
}

export function TopBuyersWidget({ buyers }: TopBuyersWidgetProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const topBuyers = buyers.slice(0, 5)

  return (
    <div className="bg-card border-border rounded-2xl border p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-eyebrow text-muted-foreground">Top Buyers</h2>
          <p className="text-muted-foreground mt-1 text-xs">Berdasarkan total nilai invoice.</p>
        </div>
        <Link
          href="/buyers"
          className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Lihat semua &rarr;
        </Link>
      </div>

      {topBuyers.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center text-sm">
          Belum ada data transaksi
        </div>
      ) : (
        <div className="flex flex-col">
          {topBuyers.map((buyer, index) => (
            <Link
              key={buyer.id}
              href={`/buyers/${buyer.id}`}
              className={`hover:bg-muted/50 flex items-center justify-between py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                index !== topBuyers.length - 1 ? 'border-border border-b' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                >
                  {index + 1}
                </div>
                <div>
                  <p className="text-foreground font-medium">{buyer.companyName}</p>
                  <p className="text-muted-foreground text-xs">
                    {buyer.country || 'Negara belum diisi'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-foreground font-bold" data-slot="figure">
                  {formatCurrency(buyer.totalValue)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {buyer.invoiceCount} invoice
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
