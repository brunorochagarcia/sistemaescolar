import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Nav } from '@/components/nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen bg-surface">
      <Nav userName={session.user.name ?? 'Usuário'} userRole={session.user.role} />
      <main className="flex-1 overflow-y-auto px-4 pb-4 pt-16 md:p-8">{children}</main>
    </div>
  )
}
