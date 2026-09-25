import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export type PipelineStage = {
  label: string;
  count: number;
  value: number;
  color: string;
  href: string;
};

type SalesPipelineProps = {
  stages: PipelineStage[];
};

export default function SalesPipeline({ stages }: SalesPipelineProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-card border-border rounded-2xl border p-6">
      <h2 className="text-eyebrow text-muted-foreground">Sales Pipeline</h2>
      <p className="text-muted-foreground mt-1 mb-5 text-xs">
        Alur quotation sampai invoice lunas. Pilih tahap untuk melihat dokumennya.
      </p>
      
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        {stages.map((stage, index) => {
          const isZero = stage.count === 0;
          return (
            <div key={stage.label} className="flex flex-col md:flex-row items-center flex-1 w-full md:w-auto">
              <Link 
                href={stage.href}
                className={`bg-muted/50 border-border group block w-full flex-1 overflow-hidden rounded-xl border transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isZero ? 'opacity-60 hover:opacity-100' : ''}`}
              >
                <div 
                  className="h-1 w-full" 
                  style={{ backgroundColor: stage.color }}
                />
                <div className="p-4">
                  <div className="text-foreground group-hover:text-primary mb-1 text-2xl leading-none font-bold transition-colors" data-slot="figure">
                    {stage.count}
                  </div>
                  <div className="text-muted-foreground mb-2 truncate text-xs">
                    {stage.label}
                  </div>
                  <div className="text-foreground text-sm font-semibold" data-slot="figure">
                    {formatCurrency(stage.value)}
                  </div>
                </div>
              </Link>
              
              {index < stages.length - 1 && (
                <div className="text-muted-foreground/50 mx-1 hidden md:flex lg:mx-3" aria-hidden="true">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
