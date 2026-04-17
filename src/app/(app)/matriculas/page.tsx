import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeSolicitarMatricula, podeGerirMateria, podeAprovarMatricula } from '@/lib/auth/permissions'
import { MatriculaActions } from '@/components/matricula-actions'
import { NovaMatriculaButton } from '@/components/nova-matricula-button'
import Link from 'next/link'
import type { StatusMatricula } from '@/generated/prisma/enums'

export const metadata = { title: 'Matrículas — Sistema Escolar' }

const statusLabels: Record<StatusMatricula, { label: string; className: string }> = {
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  APROVADA: { label: 'Aprovada', className: 'bg-green-100 text-green-700' },
  REJEITADA: { label: 'Rejeitada', className: 'bg-red-100 text-red-600' },
}

const PAGE_SIZE = 50

export default async function MatriculasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; turmaId?: string; page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeSolicitarMatricula(session.user.role) && !podeGerirMateria(session.user.role)) {
    redirect('/dashboard')
  }

  const { status, turmaId, page: pageParam } = await searchParams
  const isProfessor = session.user.role === 'PROFESSOR'
  const isAluno = session.user.role === 'ALUNO'
  const aprovacaoImediata = podeAprovarMatricula(session.user.role)

  const page = Math.max(1, parseInt(pageParam ?? '1') || 1)
  const skip = (page - 1) * PAGE_SIZE

  const where = {
    ...(status ? { status: status as StatusMatricula } : {}),
    ...(turmaId ? { materia: { turmaId } } : {}),
    ...(isProfessor ? { materia: { instrutorId: session.user.id } } : {}),
    ...(isAluno ? { alunoId: session.user.id } : {}),
  }

  const [matriculas, totalCount, alunos, materias, turmas] = await Promise.all([
    prisma.matricula.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dataInicio: 'desc' }],
      skip,
      take: PAGE_SIZE,
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
    }),
    prisma.matricula.count({ where }),
    // Data for the "Nova matrícula" modal — only needed for non-professor roles
    isProfessor
      ? Promise.resolve([])
      : prisma.aluno.findMany({
          where: { status: 'ATIVO' },
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true, numeroCadastro: true },
        }),
    isProfessor
      ? Promise.resolve([])
      : prisma.materia.findMany({
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true, turma: { select: { id: true, nome: true } } },
        }),
    isProfessor
      ? Promise.resolve([])
      : prisma.turma.findMany({
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true },
        }),
  ])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const pendentes = matriculas.filter((m) => m.status === 'PENDENTE').length

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Matrículas</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalCount} matrícula{totalCount !== 1 ? 's' : ''}
            {pendentes > 0 && (
              <span className="ml-2 font-medium text-amber-600">
                · {pendentes} pendente{pendentes !== 1 ? 's' : ''} nesta página
              </span>
            )}
          </p>
        </div>
        {!isProfessor && (
          <NovaMatriculaButton
            alunos={alunos}
            materias={materias}
            turmas={turmas}
            aprovacaoImediata={aprovacaoImediata}
          />
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
                ? 'bg-brand text-white'
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

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/matriculas"
          params={{ status, turmaId }}
        />
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v)
  }
  if (page > 1) qs.set('page', String(page))
  const q = qs.toString()
  return q ? `${basePath}?${q}` : basePath
}

function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number
  totalPages: number
  basePath: string
  params: Record<string, string | undefined>
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildHref(basePath, params, page - 1)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
          >
            ← Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildHref(basePath, params, page + 1)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
          >
            Próxima →
          </Link>
        )}
      </div>
    </div>
  )
}
