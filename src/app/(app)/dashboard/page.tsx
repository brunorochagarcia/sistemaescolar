import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { podeAprovarAluno, podeGerirFinanceiro, isDiretor } from '@/lib/auth/permissions'

export const metadata = { title: 'Dashboard — Sistema Escolar' }

// KPI counts are global (not user-specific) and update infrequently.
// Cache for 60s to avoid re-querying on every navigation to the dashboard.
// The pending student list is intentionally excluded — kept fresh so the
// "Aprovar" list always reflects the current queue.
const getDashboardKPIs = unstable_cache(
  async (mesInicioISO: string, mesFimISO: string) => {
    const inicioMes = new Date(mesInicioISO)
    const fimMes = new Date(mesFimISO)
    const [totalAtivos, totalPendentes, inadimplentes, totalVencidoAgg, receitaMesAgg, cursosData] =
      await Promise.all([
        prisma.aluno.count({ where: { status: 'ATIVO' } }),
        prisma.aluno.count({ where: { status: 'PENDENTE' } }),
        prisma.aluno.count({
          where: { status: 'ATIVO', boletos: { some: { status: 'VENCIDO' } } },
        }),
        prisma.boleto.aggregate({ _sum: { valor: true }, where: { status: 'VENCIDO' } }),
        prisma.boleto.aggregate({
          _sum: { valor: true },
          where: { status: 'PAGO', dataPagamento: { gte: inicioMes, lt: fimMes } },
        }),
        prisma.curso.findMany({
          where: { status: 'ATIVO' },
          orderBy: { nome: 'asc' },
          select: {
            id: true,
            nome: true,
            valorMensalidade: true,
            _count: {
              select: {
                turmas: true,
                boletos: { where: { status: 'VENCIDO' } },
              },
            },
            turmas: {
              select: {
                materias: {
                  select: {
                    matriculas: {
                      where: { status: 'APROVADA' },
                      select: { alunoId: true },
                    },
                  },
                },
              },
            },
          },
        }),
      ])
    return { totalAtivos, totalPendentes, inadimplentes, totalVencidoAgg, receitaMesAgg, cursosData }
  },
  ['dashboard-kpis'],
  { revalidate: 60, tags: ['dashboard'] },
)

export default async function DashboardPage() {
  const session = await auth()
  if (!session) return null

  const role = session.user.role
  const temAcademia = podeAprovarAluno(role)
  const temFinanceiro = podeGerirFinanceiro(role)
  const ehDiretor = isDiretor(role)

  const now = new Date()
  const inicioMes = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const fimMes = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1))

  // Run cached KPIs + fresh pending list in parallel
  const [kpis, alunosPendentesLista] = await Promise.all([
    getDashboardKPIs(inicioMes.toISOString(), fimMes.toISOString()),
    temAcademia
      ? prisma.aluno.findMany({
          where: { status: 'PENDENTE' },
          orderBy: { createdAt: 'asc' },
          take: 5,
          select: { id: true, nome: true, email: true, createdAt: true },
        })
      : null,
  ])

  const { totalAtivos, totalPendentes, inadimplentes, totalVencidoAgg, receitaMesAgg, cursosData } = kpis

  const totalVencido = Number(totalVencidoAgg?._sum.valor ?? 0)
  const receitaMes = Number(receitaMesAgg?._sum.valor ?? 0)

  const cursos = (cursosData ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    valorMensalidade: c.valorMensalidade ? Number(c.valorMensalidade) : null,
    totalTurmas: c._count.turmas,
    boletosVencidos: c._count.boletos,
    totalAlunos: new Set(
      c.turmas.flatMap((t) =>
        t.materias.flatMap((m) => m.matriculas.map((mat) => mat.alunoId)),
      ),
    ).size,
  }))

  const mesLabel = now.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Olá, {session.user.name?.split(' ')[0]}
          </h1>
          <p className="mt-0.5 text-sm capitalize text-zinc-500">
            {now.toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-600">
          {role.toLowerCase()}
        </span>
      </div>

      {/* KPIs acadêmicos */}
      {temAcademia && (
        <section>
          <SectionTitle>Acadêmico</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Alunos ativos" value={totalAtivos ?? 0} />
            <StatCard
              label="Aguardando aprovação"
              value={totalPendentes ?? 0}
              variant={(totalPendentes ?? 0) > 0 ? 'warning' : 'default'}
              href="/cadastros/alunos"
            />
            {temFinanceiro && (
              <>
                <StatCard
                  label="Inadimplentes"
                  value={inadimplentes ?? 0}
                  variant={(inadimplentes ?? 0) > 0 ? 'danger' : 'default'}
                  href="/financeiro?status=VENCIDO"
                />
                <StatCard
                  label="Total em atraso"
                  value={brl(totalVencido)}
                  variant={totalVencido > 0 ? 'danger' : 'default'}
                  href="/financeiro?status=VENCIDO"
                />
              </>
            )}
          </div>
        </section>
      )}

      {/* KPIs financeiros (FINANCEIRA sem acesso acadêmico) */}
      {temFinanceiro && !temAcademia && (
        <section>
          <SectionTitle>Inadimplência</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Alunos inadimplentes"
              value={inadimplentes ?? 0}
              variant={(inadimplentes ?? 0) > 0 ? 'danger' : 'default'}
              href="/financeiro?status=VENCIDO"
            />
            <StatCard
              label="Total em atraso"
              value={brl(totalVencido)}
              variant={totalVencido > 0 ? 'danger' : 'default'}
              href="/financeiro?status=VENCIDO"
            />
          </div>
        </section>
      )}

      {/* Receita do mês */}
      {temFinanceiro && (
        <section>
          <SectionTitle>Receita — {mesLabel}</SectionTitle>
          <div className="flex items-end justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4">
            <div>
              <p className="text-3xl font-bold text-zinc-900">{brl(receitaMes)}</p>
              <p className="mt-1 text-sm text-zinc-500">
                Pagamentos confirmados no mês atual
              </p>
            </div>
            <Link
              href="/financeiro?status=PAGO"
              className="shrink-0 text-xs text-zinc-400 hover:text-zinc-700 hover:underline"
            >
              Ver todos →
            </Link>
          </div>
        </section>
      )}

      {/* Pendentes de aprovação */}
      {temAcademia &&
        (totalPendentes ?? 0) > 0 &&
        alunosPendentesLista &&
        alunosPendentesLista.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle className="mb-0">Pendentes de aprovação</SectionTitle>
              <Link
                href="/cadastros/alunos"
                className="text-xs text-zinc-400 hover:text-zinc-700 hover:underline"
              >
                Ver todos →
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
              <ul className="divide-y divide-amber-100">
                {alunosPendentesLista.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{a.nome}</p>
                      <p className="text-xs text-zinc-400">{a.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-zinc-400">
                        {a.createdAt.toLocaleDateString('pt-BR')}
                      </p>
                      <Link
                        href="/cadastros/alunos"
                        className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                      >
                        Aprovar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

      {/* Breakdown por curso — DIRETOR */}
      {ehDiretor && cursos.length > 0 && (
        <section>
          <SectionTitle>Por curso</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">
                    Curso
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">
                    Turmas
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">
                    Alunos
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">
                    Bol. vencidos
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">
                    Mensalidade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {cursos.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-900">{c.nome}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {c.totalTurmas}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {c.totalAlunos}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.boletosVencidos > 0 ? (
                        <Link
                          href={`/financeiro?status=VENCIDO`}
                          className="font-medium text-red-600 hover:underline"
                        >
                          {c.boletosVencidos}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {c.valorMensalidade != null
                        ? brl(c.valorMensalidade)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ações rápidas */}
      <section>
        <SectionTitle>Ações rápidas</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {temAcademia && <QuickLink href="/cadastros/alunos" label="Alunos" />}
          {temFinanceiro && <QuickLink href="/financeiro" label="Financeiro" />}
          {temAcademia && <QuickLink href="/turmas" label="Turmas" />}
          {ehDiretor && <QuickLink href="/cursos" label="Cursos" />}
          {temAcademia && <QuickLink href="/matriculas" label="Matrículas" />}
        </div>
      </section>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brl(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2
      className={`mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 ${className}`}
    >
      {children}
    </h2>
  )
}

type Variant = 'default' | 'warning' | 'danger'

const variantStyles: Record<Variant, { card: string; value: string }> = {
  default: { card: 'border-zinc-200 bg-white', value: 'text-zinc-900' },
  warning: { card: 'border-amber-200 bg-amber-50', value: 'text-amber-700' },
  danger: { card: 'border-red-200 bg-red-50', value: 'text-red-600' },
}

function StatCard({
  label,
  value,
  variant = 'default',
  href,
}: {
  label: string
  value: string | number
  variant?: Variant
  href?: string
}) {
  const { card, value: valueColor } = variantStyles[variant]

  const inner = (
    <div className={`rounded-xl border p-4 transition-colors ${card} ${href ? 'hover:opacity-80' : ''}`}>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
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