# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Haturan Trade App

Internal spice export management system — `app.haturan.com`

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (base-nova style)
- Supabase (PostgreSQL + Auth + Storage)
- @react-pdf/renderer, Recharts, lucide-react

## Next.js 16
APIs dan konvensi mungkin berbeda dari training data. Baca `node_modules/next/dist/docs/` sebelum menulis kode Next.js-spesifik. Heed all deprecation notices.
- `middleware.ts` sudah deprecated → gunakan `proxy.ts` dengan export `proxy` (bukan `middleware`)

## Tailwind CSS v4
- Import: `@import "tailwindcss"` (bukan direktif v3 `@tailwind base/components/utilities`)
- CSS variables menggunakan format OKLCH, bukan hex — jangan tulis hex di `globals.css`
- Tidak ada `tailwind.config.js`; theming lewat CSS variables di `globals.css`

## TypeScript
- Path alias: `@/*` → project root
- Strict mode aktif

## Supabase
- Server Components / Route Handlers: `import { createClient } from '@/lib/supabase/server'`
- Client Components: `import { createClient } from '@/lib/supabase/client'`
- Middleware `middleware.ts` protects semua routes — redirect ke `/login` jika belum auth

## Brand Colors
- Primary: `#1a472a` (deep forest green) — gunakan sebagai inline style, bukan Tailwind class
- Secondary: `#c9a227` (warm gold)

## Commands
- `npm run lint` — lint check
- `npm run format` — format semua file dengan Prettier
- `npm run format:check` — check formatting tanpa write

## Environment
Copy `.env.local.example` to `.env.local` dan isi Supabase credentials.

## Database
SQL migration: `supabase/migrations/001_initial_schema.sql` — jalankan di Supabase SQL Editor.
TypeScript types: `types/index.ts`

## Build Progress
- [x] Fase 1: Foundation (init, auth, layout, dashboard)
- [x] Supabase JWT anon key (format lama `eyJ...`) — bukan `sb_publishable_`
- [x] Fase 2: Price Tracker
- [x] Fase 3: Buyer CRM + Quotation Builder
- [x] Fase 4: Invoice + Payment
- [x] Fase 5: Purchase Order
- [x] Fase 6: Integration & Deploy
