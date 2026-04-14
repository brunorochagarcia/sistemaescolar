import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeSolicitarMatricula, podeGerirMateria } from '@/lib/auth/permissions'
import { MatriculaActions } from '@/components/matricula-actions'
import Link from 'next/link'
import type { StatusMatricula } from '@/generated/prisma/enums'

export const metadata = { title: 'Matrículas — Sistema Escolar' }

const statusLabels: Record<StatusMatricula, { label: string; className: string }> = {
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  APROVADA: { label: 'Aprovada', className: 'bg-green-100 text-green-700' },
  REJEITADA: { label: 'Rejeitada', className: 'bg-red-100 text-red-600' },
}

export default async function MatriculasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; turmaId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  // PROFESSOR pode ver e aprovar; ALUNO/COORDENADOR/DIRETOR podem solicitar
  if (!podeSolicitarMatricula(session.user.role) && !podeGerirMateria(session.user.role)) {
    redirect('/dashboard')
  }

  const { status, turmaId } = await searchParams

  // PROFESSOR só vê matrículas das suas próprias matérias
  const isProfessor = session.user.role === 'PROFESSOR'

  const matriculas = await prisma.matricula.findMany({
    where: {
      ...(status ? { status: status as StatusMatricula } : {}),
      ...(turmaId ? { materia: { turmaId } } : {}),
      ...(isProfessor ? { materia: { instrutorId: session.user.id } } : {}),
    },
    orderBy: [{ status: 'asc' }, { dataInicio: 'desc' }],
    select: {
      id: true,
      status: true,
      dataInicio: true,
      aluno: { select: { id: true, nome: true, numeroCadastro: true } },
      materia: {
        select: {
          id: true,
          nome: true,
          instrutorId: true,
          turma: { select: { id: true, nome: true } },
        },
      },
    },
  })

  const pendentes = matriculas.filter((m) => m.status === 'PENDENTE').length

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Matrículas</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {matriculas.length} matrícula{matriculas.length !== 1 ? 's' : ''}
            {pendentes > 0 && (
              <span className="ml-2 font-medium text-amber-600">
                · {pendentes} pendente{pendentes !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {!isProfessor && (
          <Link
            href="/matriculas/nova"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + Nova matrícula
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(['', 'PENDENTE', 'APROVADA', 'REJEITADA'] as const).map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `/matriculas?status=${s}` : '/matriculas'}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === s || (!status && s === '')
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            {s === '' ? 'Todos' : statusLabels[s].label}
          </Link>
        ))}
      </div>

      {matriculas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhuma matrícula encontrada.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Aluno</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Matéria</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Turma</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Solicitado em</th>
                {podeGerirMateria(session.user.role) && (
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {matriculas.map((m) => {
                const badge = statusLabels[m.status]
                // PROFESSOR só pode aprovar matérias que ele instrui e que têm instrutor
                const podeAprovar =
                  session.user.role !== 'PROFESSOR' ||
                  (!!m.materia.instrutorId && m.materia.instrutorId === session.user.id)

                return (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/alunos/${m.aluno.id}`} className="font-medium text-zinc-900 hover:underline">
                        {m.aluno.nome}
                      </Link>
                      {m.aluno.numeroCadastro && (
                        <p className="mt-0.5 font-mono text-xs text-zinc-400">{m.aluno.numeroCadastro}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{m.materia.nome}</td>
                    <td className="px-4 py-3 text-zinc-500">{m.materia.turma.nome}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {m.dataInicio.toLocaleDateString('pt-BR')}
                    </td>
                    {podeGerirMateria(session.user.role) && (
                      <td className="px-4 py-3 text-right">
                        <MatriculaActions
                          matriculaId={m.id}
                          status={m.status}
                          podeAprovar={podeAprovar}
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
