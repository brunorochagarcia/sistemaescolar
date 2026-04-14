import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirAcademico } from '@/lib/auth/permissions'
import { MateriaForm } from '@/components/materia-form'
import Link from 'next/link'

export const metadata = { title: 'Nova Matéria — Sistema Escolar' }

export default async function NovaMateriaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirAcademico(session.user.role)) redirect('/dashboard')

  const { id } = await params

  const [turma, professores] = await Promise.all([
    prisma.turma.findUnique({
      where: { id },
      select: { id: true, nome: true },
    }),
    prisma.user.findMany({
      where: { role: 'PROFESSOR' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  if (!turma) notFound()

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/turmas" className="hover:text-zinc-900">Turmas</Link>
          <span>/</span>
          <Link href={`/turmas/${id}`} className="hover:text-zinc-900">{turma.nome}</Link>
          <span>/</span>
          <span>Nova matéria</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Nova Matéria</h1>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <MateriaForm
          turmaId={id}
          professores={professores.map((p) => ({ id: p.id, name: p.name ?? '' }))}
        />
      </div>
    </div>
  )
}
