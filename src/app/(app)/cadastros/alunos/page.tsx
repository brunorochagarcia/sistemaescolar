import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeAprovarAluno } from '@/lib/auth/permissions'
import { AlunoActions } from '@/components/aluno-actions'

export const metadata = { title: 'Alunos — Sistema Escolar' }

const statusLabels = {
  ATIVO: { label: 'Ativo', className: 'bg-green-100 text-green-700' },
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  INATIVO: { label: 'Inativo', className: 'bg-zinc-100 text-zinc-500' },
} as const

export default async function AlunosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Guard: only DIRETOR and COORDENADOR can access this page
  if (!podeAprovarAluno(session.user.role)) {
    redirect('/dashboard')
  }

  const alunos = await prisma.aluno.findMany({
    where: { status: { not: 'INATIVO' } },
    orderBy: [{ status: 'asc' }, { nome: 'asc' }],
    select: {
      id: true,
      nome: true,
      email: true,
      numeroCadastro: true,
      status: true,
      createdAt: true,
    },
  })

  const pendentes = alunos.filter((a) => a.status === 'PENDENTE')
  const ativos = alunos.filter((a) => a.status === 'ATIVO')

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Alunos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            {pendentes.length > 0 && (
              <span className="ml-2 font-medium text-amber-600">
                · {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''} de aprovação
              </span>
            )}
          </p>
        </div>
      </div>

      {alunos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum aluno cadastrado ainda.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Alunos se inscrevem em{' '}
            <span className="font-mono text-zinc-500">/register</span>
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">E-mail</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Nº Cadastro</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Inscrito em</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {alunos.map((aluno) => {
                const badge = statusLabels[aluno.status]
                return (
                  <tr key={aluno.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{aluno.nome}</td>
                    <td className="px-4 py-3 text-zinc-500">{aluno.email ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-zinc-500">
                      {aluno.numeroCadastro ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {aluno.createdAt.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AlunoActions alunoId={aluno.id} status={aluno.status} />
                    </td>
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
