import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirAcademico } from '@/lib/auth/permissions'
import { MateriasSection } from '@/components/materias-section'
import Link from 'next/link'

export const metadata = { title: 'Turma — Sistema Escolar' }

const turnoLabels = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }

export default async function TurmaDetailPage({
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
      select: {
        id: true,
        nome: true,
        turno: true,
        anoLetivo: true,
        curso: { select: { id: true, nome: true } },
        materias: {
          orderBy: { nome: 'asc' },
          select: {
            id: true,
            nome: true,
            descricao: true,
            instrutorId: true,
            instrutor: { select: { name: true } },
            _count: { select: { matriculas: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: 'PROFESSOR' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!turma) notFound()

  const materias = turma.materias.map((m) => ({
    id: m.id,
    nome: m.nome,
    descricao: m.descricao,
    instrutorId: m.instrutorId,
    instrutorNome: m.instrutor?.name ?? null,
    matriculasCount: m._count.matriculas,
  }))

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
            <Link href="/turmas" className="hover:text-zinc-900">Turmas</Link>
            <span>/</span>
            <span>{turma.nome}</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">{turma.nome}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {turma.curso.nome} · {turnoLabels[turma.turno]} · {turma.anoLetivo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/turmas/${id}/chamada`}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Chamada
          </Link>
          <Link
            href={`/turmas/${id}/notas`}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Notas
          </Link>
          <Link
            href={`/turmas/${id}/ranking`}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Ranking
          </Link>
        </div>
      </div>

      <MateriasSection turmaId={id} materias={materias} professores={professores} />
    </div>
  )
}
