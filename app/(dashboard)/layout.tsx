import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden md:flex-row">
      <Sidebar />
      <main className="flex min-h-0 flex-1 overflow-y-auto">
        <div className="w-full">{children}</div>
      </main>
    </div>
  )
}
