import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirAcademico } from '@/lib/auth/permissions'
import { MateriaActions } from '@/components/materia-actions'
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

  const turma = await prisma.turma.findUnique({
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
          instrutor: { select: { name: true } },
          _count: { select: { matriculas: true } },
        },
      },
    },
  })
  if (!turma) notFound()

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
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Chamada
          </Link>
          <Link
            href={`/turmas/${id}/notas`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Notas
          </Link>
          <Link
            href={`/turmas/${id}/materias/nova`}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Nova matéria
          </Link>
        </div>
      </div>

      {turma.materias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhuma matéria cadastrada nesta turma.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Matéria</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Professor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Matrículas</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {turma.materias.map((materia) => (
                <tr key={materia.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{materia.nome}</p>
                    {materia.descricao && (
                      <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{materia.descricao}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {materia.instrutor?.name ?? <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{materia._count.matriculas}</td>
                  <td className="px-4 py-3 text-right">
                    <MateriaActions materiaId={materia.id} turmaId={id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
