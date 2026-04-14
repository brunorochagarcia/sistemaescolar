import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { podeGerirAcademico } from '@/lib/auth/permissions'
import { CursoForm } from '@/components/curso-form'

export const metadata = { title: 'Novo Curso — Sistema Escolar' }

export default async function NovoCursoPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirAcademico(session.user.role)) redirect('/dashboard')

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Novo Curso</h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <CursoForm />
      </div>
    </div>
  )
}
