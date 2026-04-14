import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeGerirAcademico } from '@/lib/auth/permissions'
import { TurmaForm } from '@/components/turma-form'

export const metadata = { title: 'Nova Turma — Sistema Escolar' }

export default async function NovaTurmaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirAcademico(session.user.role)) redirect('/dashboard')

  const cursos = await prisma.curso.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  })

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Nova Turma</h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <TurmaForm cursos={cursos} />
      </div>
    </div>
  )
}
