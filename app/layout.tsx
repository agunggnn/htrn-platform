import type { Metadata, Viewport } from 'next'
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

/* Plus Jakarta Sans — drawn in Jakarta, for the city. The working face of the
   app: labels, tables, forms. */
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
})

/* Fraunces — a high-contrast serif with the weight of a ledger heading. Used
   only for the wordmark and page titles, never for body copy. */
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
})

/* JetBrains Mono — figures, document numbers, dates. Tabular by default. */
const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Haturan Trade',
    template: '%s · Haturan Trade',
  },
  description:
    'Internal trading desk for Haturan spice exports — daily prices, buyers, quotations, invoices, and purchase orders.',
  applicationName: 'Haturan Trade',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6f3' },
    { media: '(prefers-color-scheme: dark)', color: '#141d17' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="id"
      className={`${jakarta.variable} ${fraunces.variable} ${jetbrains.variable} h-full`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans antialiased">
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  )
}
