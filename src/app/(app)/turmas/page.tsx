import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeGerirAcademico, isDiretor } from '@/lib/auth/permissions'
import { TurmaActions } from '@/components/turma-actions'
import Link from 'next/link'

export const metadata = { title: 'Turmas — Sistema Escolar' }

const turnoLabels = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }

export default async function TurmasPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirAcademico(session.user.role)) redirect('/dashboard')

  const cursos = await prisma.curso.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      turmas: {
        orderBy: [{ anoLetivo: 'desc' }, { nome: 'asc' }],
        select: {
          id: true,
          nome: true,
          turno: true,
          anoLetivo: true,
          _count: { select: { materias: true } },
        },
      },
    },
  })

  const podeExcluir = isDiretor(session.user.role)
  const totalTurmas = cursos.reduce((sum, c) => sum + c.turmas.length, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Turmas</h1>
          <p className="mt-1 text-sm text-zinc-500">{totalTurmas} turma(s) em {cursos.filter(c => c.turmas.length > 0).length} curso(s)</p>
        </div>
        <Link
          href="/turmas/nova"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Nova turma
        </Link>
      </div>

      {totalTurmas === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhuma turma cadastrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {cursos.filter((c) => c.turmas.length > 0).map((curso) => (
            <section key={curso.id}>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                {curso.nome}
              </h2>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500">Turma</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500">Turno</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500">Ano Letivo</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500">Matérias</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {curso.turmas.map((turma) => (
                      <tr key={turma.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium text-zinc-900">{turma.nome}</td>
                        <td className="px-4 py-3 text-zinc-500">{turnoLabels[turma.turno]}</td>
                        <td className="px-4 py-3 text-zinc-500">{turma.anoLetivo}</td>
                        <td className="px-4 py-3 text-zinc-500">{turma._count.materias}</td>
                        <td className="px-4 py-3 text-right">
                          {podeExcluir ? (
                            <TurmaActions turmaId={turma.id} />
                          ) : (
                            <Link
                              href={`/turmas/${turma.id}`}
                              className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                            >
                              Ver
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
