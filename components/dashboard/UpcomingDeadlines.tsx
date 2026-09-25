import Link from 'next/link';
import { FileText, Receipt, ShoppingCart, CheckCircle } from 'lucide-react';

export type Deadline = {
  id: string;
  type: 'quotation_expiry' | 'invoice_due' | 'po_delivery';
  label: string;
  counterparty: string;
  dueDate: string;
  daysLeft: number;
  value: number | null;
  href: string;
};

type UpcomingDeadlinesProps = {
  deadlines: Deadline[];
};

export function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
  // Sort by days left ascending (most urgent first)
  const sortedDeadlines = [...deadlines]
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 8);

  const getIconConfig = (type: Deadline['type']) => {
    switch (type) {
      case 'quotation_expiry':
        return {
          Icon: FileText,
          color: '#c9a227', // gold
          bg: 'rgba(201, 162, 39, 0.12)',
        };
      case 'invoice_due':
        return {
          Icon: Receipt,
          color: '#dc2626', // red
          bg: 'rgba(220, 38, 38, 0.12)',
        };
      case 'po_delivery':
        return {
          Icon: ShoppingCart,
          color: '#7c3aed', // purple
          bg: 'rgba(124, 58, 237, 0.12)',
        };
    }
  };

  const getStatusBadge = (daysLeft: number) => {
    if (daysLeft < 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
          Terlambat {Math.abs(daysLeft)} hari
        </span>
      );
    }
    if (daysLeft === 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10">
          Hari ini
        </span>
      );
    }
    if (daysLeft <= 3) {
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/10">
          {daysLeft} hari lagi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        {daysLeft} hari lagi
      </span>
    );
  };

  return (
    <div className="bg-card border-border flex h-full flex-col rounded-2xl border p-6">
      <h3 className="text-eyebrow text-muted-foreground">Deadline dan Reminder</h3>
      <p className="text-muted-foreground mt-1 mb-4 text-xs">
        Quotation kedaluwarsa, invoice jatuh tempo, dan jadwal PO 7 hari ke depan.
      </p>
      
      {sortedDeadlines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-foreground text-sm font-medium">Tidak ada deadline mendekat</p>
          <p className="text-muted-foreground mt-1 text-xs">Semua dokumen masih aman.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {sortedDeadlines.map((deadline) => {
            const { Icon, color, bg } = getIconConfig(deadline.type);
            return (
              <Link
                key={deadline.id}
                href={deadline.href}
                className="hover:bg-muted/50 group -mx-2 flex items-center justify-between rounded-xl p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: bg }}
                  >
                    <Icon size={16} style={{ color }} aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground group-hover:text-primary text-sm font-medium transition-colors">
                      {deadline.label}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {deadline.counterparty}
                    </span>
                  </div>
                </div>
                <div>{getStatusBadge(deadline.daysLeft)}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
