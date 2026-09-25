import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, currency: string = 'IDR'): string {
  const val = amount ?? 0
  const isIdr = !currency || currency.toUpperCase() === 'IDR'
  return new Intl.NumberFormat(isIdr ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: isIdr ? 'IDR' : currency.toUpperCase(),
    maximumFractionDigits: isIdr ? 0 : 2,
  }).format(val)
}

export function formatRupiah(amount: number | null | undefined): string {
  return formatCurrency(amount, 'IDR')
}
