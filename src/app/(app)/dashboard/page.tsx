import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { podeAprovarAluno, podeGerirFinanceiro } from '@/lib/auth/permissions'

export const metadata = { title: 'Dashboard — Sistema Escolar' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session) return null

  const role = session.user.role

  // Fetch counts relevant to this user's role
  const [totalAlunos, alunosPendentes, totalCursos, totalTurmas] = await Promise.all([
    podeAprovarAluno(role)
      ? prisma.aluno.count({ where: { status: { not: 'INATIVO' } } })
      : Promise.resolve(null),
    podeAprovarAluno(role)
      ? prisma.aluno.count({ where: { status: 'PENDENTE' } })
      : Promise.resolve(null),
    podeAprovarAluno(role) ? prisma.curso.count() : Promise.resolve(null),
    podeAprovarAluno(role) ? prisma.turma.count() : Promise.resolve(null),
  ])

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">
        Olá, {session.user.name?.split(' ')[0]}
      </h1>

      {podeAprovarAluno(role) && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Visão geral
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Alunos ativos" value={totalAlunos ?? 0} />
            <StatCard
              label="Pendentes de aprovação"
              value={alunosPendentes ?? 0}
              highlight={!!alunosPendentes && alunosPendentes > 0}
            />
            <StatCard label="Cursos" value={totalCursos ?? 0} />
            <StatCard label="Turmas" value={totalTurmas ?? 0} />
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          Ações rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {podeAprovarAluno(role) && (
            <QuickLink href="/cadastros/alunos" label="Gerenciar Alunos" />
          )}
          {podeGerirFinanceiro(role) && (
            <QuickLink href="/financeiro" label="Financeiro" />
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? 'border-amber-200 bg-amber-50'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      {label}
      <span className="text-zinc-400">→</span>
    </Link>
  )
}
