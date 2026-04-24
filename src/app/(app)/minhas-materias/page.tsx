import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MatriculaActions } from '@/components/matricula-actions'
import Link from 'next/link'

export const metadata = { title: 'Minhas Matérias — Sistema Escolar' }

export default async function MinhasMateriaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role !== 'PROFESSOR') redirect('/dashboard')

  const materias = await prisma.materia.findMany({
    where: { instrutorId: session.user.id },
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      turma: { select: { id: true, nome: true } },
      matriculas: {
        where: { status: 'PENDENTE' },
        orderBy: { dataInicio: 'asc' },
        select: {
          id: true,
          status: true,
          dataInicio: true,
          aluno: { select: { id: true, nome: true, numeroCadastro: true } },
        },
      },
      _count: {
        select: { matriculas: true },
      },
    },
  })

  const totalPendentes = materias.reduce((acc, m) => acc + m.matriculas.length, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Minhas Matérias</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {materias.length} matéria{materias.length !== 1 ? 's' : ''}
          {totalPendentes > 0 && (
            <span className="ml-2 font-medium text-amber-600">
              · {totalPendentes} matrícula{totalPendentes !== 1 ? 's' : ''} pendente{totalPendentes !== 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {materias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Você ainda não está atribuído como professor de nenhuma matéria.</p>
          <p className="mt-1 text-sm text-zinc-400">Um coordenador pode atribuir matérias a você.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {materias.map((materia) => (
            <div key={materia.id} className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                <div>
                  <p className="font-medium text-zinc-900">{materia.nome}</p>
                  <p className="text-xs text-zinc-500">{materia.turma.nome}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-400">
                    {materia._count.matriculas} matrícula{materia._count.matriculas !== 1 ? 's' : ''} total
                  </span>
                  <Link
                    href={`/turmas/${materia.turma.id}`}
                    className="text-xs text-zinc-500 hover:text-zinc-900 hover:underline"
                  >
                    Ver turma →
                  </Link>
                </div>
              </div>

              {materia.matriculas.length === 0 ? (
                <p className="px-4 py-4 text-sm text-zinc-400">Nenhuma matrícula pendente.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Aluno</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Solicitado em</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {materia.matriculas.map((m) => (
                      <tr key={m.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-900">{m.aluno.nome}</p>
                          {m.aluno.numeroCadastro && (
                            <p className="font-mono text-xs text-zinc-400">{m.aluno.numeroCadastro}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {m.dataInicio.toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <MatriculaActions
                            matriculaId={m.id}
                            status={m.status}
                            podeAprovar={true}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
