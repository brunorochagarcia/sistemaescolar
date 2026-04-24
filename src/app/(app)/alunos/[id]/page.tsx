import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeAprovarAluno } from '@/lib/auth/permissions'
import Link from 'next/link'
import type { StatusMatricula } from '@/generated/prisma/enums'

export const metadata = { title: 'Perfil do Aluno — Sistema Escolar' }

const statusLabels: Record<StatusMatricula, { label: string; className: string }> = {
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  APROVADA: { label: 'Aprovada', className: 'bg-green-100 text-green-700' },
  REJEITADA: { label: 'Rejeitada', className: 'bg-red-100 text-red-600' },
}

const statusAlunoLabels = {
  ATIVO: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  INATIVO: { label: 'Inativo', className: 'bg-zinc-100 text-zinc-500' },
} as const

export default async function AlunoPerfilPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeAprovarAluno(session.user.role)) redirect('/dashboard')

  const { id } = await params

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      emailResponsavel: true,
      nomeResponsavel: true,
      telefone: true,
      rg: true,
      endereco: true,
      numeroCadastro: true,
      dataNascimento: true,
      status: true,
      createdAt: true,
      matriculas: {
        orderBy: { dataInicio: 'desc' },
        select: {
          id: true,
          status: true,
          dataInicio: true,
          materia: {
            select: {
              id: true,
              nome: true,
              turma: { select: { id: true, nome: true } },
            },
          },
        },
      },
    },
  })
  if (!aluno) notFound()

  const alunoStatus = statusAlunoLabels[aluno.status]

  const matriculasPorStatus = {
    APROVADA: aluno.matriculas.filter((m) => m.status === 'APROVADA').length,
    PENDENTE: aluno.matriculas.filter((m) => m.status === 'PENDENTE').length,
    REJEITADA: aluno.matriculas.filter((m) => m.status === 'REJEITADA').length,
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/cadastros/alunos" className="hover:text-zinc-900">Alunos</Link>
        <span>/</span>
        <span>{aluno.nome}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dados do aluno */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 lg:col-span-1">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">{aluno.nome}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${alunoStatus.className}`}>
              {alunoStatus.label}
            </span>
          </div>

          <dl className="space-y-3 text-sm">
            {aluno.numeroCadastro && (
              <div>
                <dt className="text-zinc-400">Nº Cadastro</dt>
                <dd className="font-mono font-medium text-zinc-700">{aluno.numeroCadastro}</dd>
              </div>
            )}
            <div>
              <dt className="text-zinc-400">E-mail</dt>
              <dd className="text-zinc-700">{aluno.email ?? '—'}</dd>
            </div>
            {aluno.dataNascimento && (
              <div>
                <dt className="text-zinc-400">Nascimento</dt>
                <dd className="text-zinc-700">
                  {aluno.dataNascimento.toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
            {aluno.telefone && (
              <div>
                <dt className="text-zinc-400">Telefone</dt>
                <dd className="text-zinc-700">{aluno.telefone}</dd>
              </div>
            )}
            {aluno.rg && (
              <div>
                <dt className="text-zinc-400">RG</dt>
                <dd className="text-zinc-700">{aluno.rg}</dd>
              </div>
            )}
            {aluno.endereco && (
              <div>
                <dt className="text-zinc-400">Endereço</dt>
                <dd className="text-zinc-700">{aluno.endereco}</dd>
              </div>
            )}
            {(aluno.nomeResponsavel || aluno.emailResponsavel) && (
              <div className="border-t border-zinc-100 pt-3">
                <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Responsável</dt>
                {aluno.nomeResponsavel && (
                  <dd className="text-zinc-700">{aluno.nomeResponsavel}</dd>
                )}
                {aluno.emailResponsavel && (
                  <dd className="text-zinc-500 text-xs">{aluno.emailResponsavel}</dd>
                )}
              </div>
            )}
            <div>
              <dt className="text-zinc-400">Cadastrado em</dt>
              <dd className="text-zinc-700">{aluno.createdAt.toLocaleDateString('pt-BR')}</dd>
            </div>
          </dl>

          {/* Resumo de matrículas */}
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Matrículas</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-green-50 px-2 py-2">
                <p className="text-lg font-semibold text-green-700">{matriculasPorStatus.APROVADA}</p>
                <p className="text-xs text-green-600">Aprovadas</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-2">
                <p className="text-lg font-semibold text-amber-700">{matriculasPorStatus.PENDENTE}</p>
                <p className="text-xs text-amber-600">Pendentes</p>
              </div>
              <div className="rounded-lg bg-zinc-50 px-2 py-2">
                <p className="text-lg font-semibold text-zinc-500">{matriculasPorStatus.REJEITADA}</p>
                <p className="text-xs text-zinc-400">Rejeitadas</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Link
              href={`/alunos/${id}/notas`}
              className="block w-full rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Ver boletim
            </Link>
            <Link
              href={`/alunos/${id}/frequencia`}
              className="block w-full rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Ver frequência
            </Link>
            <Link
              href={`/matriculas/nova`}
              className="block w-full rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              + Nova matrícula
            </Link>
          </div>
        </div>

        {/* Lista de matrículas */}
        <div className="lg:col-span-2">
          <h3 className="mb-3 text-base font-semibold text-zinc-900">Histórico de Matrículas</h3>

          {aluno.matriculas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center">
              <p className="text-zinc-500">Nenhuma matrícula registrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Matéria</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Turma</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Solicitado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {aluno.matriculas.map((m) => {
                    const badge = statusLabels[m.status]
                    return (
                      <tr key={m.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium text-zinc-900">{m.materia.nome}</td>
                        <td className="px-4 py-3 text-zinc-500">{m.materia.turma.nome}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">
                          {m.dataInicio.toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
