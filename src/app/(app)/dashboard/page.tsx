import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'

export const metadata = { title: 'Dashboard — Sistema Escolar' }

// ─── Cached global KPIs ───────────────────────────────────────────────────────
// User-scoped data (PROFESSOR, ALUNO) is never cached here.

const getDiretorKPIs = unstable_cache(
  async (inicioMesISO: string, fimMesISO: string) => {
    const inicioMes = new Date(inicioMesISO)
    const fimMes   = new Date(fimMesISO)
    const [
      totalAtivos, totalPendentes, inadimplentes,
      totalVencidoAgg, receitaMesAgg, receitaPrevistaAgg, cursosData,
    ] = await Promise.all([
      prisma.aluno.count({ where: { status: 'ATIVO' } }),
      prisma.aluno.count({ where: { status: 'PENDENTE' } }),
      prisma.aluno.count({ where: { status: 'ATIVO', boletos: { some: { status: 'VENCIDO' } } } }),
      prisma.boleto.aggregate({ _sum: { valor: true }, where: { status: 'VENCIDO' } }),
      prisma.boleto.aggregate({ _sum: { valor: true }, where: { status: 'PAGO', dataPagamento: { gte: inicioMes, lt: fimMes } } }),
      prisma.boleto.aggregate({ _sum: { valor: true }, where: { mesReferencia: { gte: inicioMes, lt: fimMes } } }),
      prisma.curso.findMany({
        where: { status: 'ATIVO' },
        orderBy: { nome: 'asc' },
        select: {
          id: true, nome: true, valorMensalidade: true,
          _count: { select: { turmas: true, boletos: { where: { status: 'VENCIDO' } } } },
          turmas: { select: { materias: { select: { matriculas: { where: { status: 'APROVADA' }, select: { alunoId: true } } } } } },
        },
      }),
    ])
    return { totalAtivos, totalPendentes, inadimplentes, totalVencidoAgg, receitaMesAgg, receitaPrevistaAgg, cursosData }
  },
  ['dashboard-diretor'],
  { revalidate: 60, tags: ['dashboard'] },
)

const getFinanceiraKPIs = unstable_cache(
  async (inicioMesISO: string, fimMesISO: string) => {
    const inicioMes = new Date(inicioMesISO)
    const fimMes   = new Date(fimMesISO)
    const [inadimplentes, totalVencidoAgg, receitaMesAgg, receitaPrevistaAgg, boletosPorStatus] = await Promise.all([
      prisma.aluno.count({ where: { status: 'ATIVO', boletos: { some: { status: 'VENCIDO' } } } }),
      prisma.boleto.aggregate({ _sum: { valor: true }, where: { status: 'VENCIDO' } }),
      prisma.boleto.aggregate({ _sum: { valor: true }, where: { status: 'PAGO', dataPagamento: { gte: inicioMes, lt: fimMes } } }),
      prisma.boleto.aggregate({ _sum: { valor: true }, where: { mesReferencia: { gte: inicioMes, lt: fimMes } } }),
      prisma.boleto.groupBy({
        by: ['status'],
        where: { mesReferencia: { gte: inicioMes, lt: fimMes } },
        _count: { _all: true },
      }),
    ])
    return { inadimplentes, totalVencidoAgg, receitaMesAgg, receitaPrevistaAgg, boletosPorStatus }
  },
  ['dashboard-financeira'],
  { revalidate: 60, tags: ['dashboard'] },
)

const getCoordenadorKPIs = unstable_cache(
  async (inicioMesISO: string, fimMesISO: string) => {
    const inicioMes = new Date(inicioMesISO)
    const fimMes   = new Date(fimMesISO)
    const [totalAtivos, totalPendentes, totalPresencas, presentesCount, cursosData] = await Promise.all([
      prisma.aluno.count({ where: { status: 'ATIVO' } }),
      prisma.aluno.count({ where: { status: 'PENDENTE' } }),
      prisma.presenca.count({ where: { data: { gte: inicioMes, lt: fimMes } } }),
      prisma.presenca.count({ where: { data: { gte: inicioMes, lt: fimMes }, status: { in: ['PRESENTE', 'ATRASADO'] } } }),
      prisma.curso.findMany({
        where: { status: 'ATIVO' },
        orderBy: { nome: 'asc' },
        select: {
          id: true, nome: true,
          _count: { select: { turmas: true } },
          turmas: { select: { materias: { select: { matriculas: { where: { status: 'APROVADA' }, select: { alunoId: true } } } } } },
        },
      }),
    ])
    return { totalAtivos, totalPendentes, totalPresencas, presentesCount, cursosData }
  },
  ['dashboard-coordenador'],
  { revalidate: 60, tags: ['dashboard'] },
)

// ─── Main page ────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  if (!session) return null

  const { role, id: userId, name } = session.user
  const userName = name ?? 'Usuário'

  const now      = new Date()
  const inicioMes = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
  const fimMes    = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1))
  const mesLabel  = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const pageHeader = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Olá, {userName.split(' ')[0]}
        </h1>
        <p className="mt-0.5 text-sm capitalize text-zinc-500">
          {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium capitalize text-zinc-600">
        {role.toLowerCase()}
      </span>
    </div>
  )

  // ── DIRETOR ──────────────────────────────────────────────────────────────────
  if (role === 'DIRETOR') {
    const [kpis, alunosPendentes] = await Promise.all([
      getDiretorKPIs(inicioMes.toISOString(), fimMes.toISOString()),
      prisma.aluno.findMany({
        where: { status: 'PENDENTE' },
        orderBy: { createdAt: 'asc' },
        take: 5,
        select: { id: true, nome: true, email: true, createdAt: true },
      }),
    ])

    const { totalAtivos, totalPendentes, inadimplentes, totalVencidoAgg, receitaMesAgg, receitaPrevistaAgg, cursosData } = kpis
    const totalVencido    = Number(totalVencidoAgg._sum.valor  ?? 0)
    const receitaMes      = Number(receitaMesAgg._sum.valor    ?? 0)
    const receitaPrevista = Number(receitaPrevistaAgg._sum.valor ?? 0)

    const cursos = cursosData.map(c => ({
      id: c.id, nome: c.nome,
      valorMensalidade: c.valorMensalidade ? Number(c.valorMensalidade) : null,
      totalTurmas:     c._count.turmas,
      boletosVencidos: c._count.boletos,
      totalAlunos:     new Set(c.turmas.flatMap(t => t.materias.flatMap(m => m.matriculas.map(mat => mat.alunoId)))).size,
    }))

    return (
      <div className="mx-auto max-w-5xl space-y-8">
        {pageHeader}

        <section>
          <SectionTitle>Acadêmico</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Alunos ativos" value={totalAtivos} />
            <StatCard label="Aguardando aprovação" value={totalPendentes} variant={totalPendentes > 0 ? 'warning' : 'default'} href="/cadastros/alunos" />
            <StatCard label="Inadimplentes" value={inadimplentes} variant={inadimplentes > 0 ? 'danger' : 'default'} href="/financeiro?status=VENCIDO" />
            <StatCard label="Total em atraso" value={brl(totalVencido)} variant={totalVencido > 0 ? 'danger' : 'default'} href="/financeiro?status=VENCIDO" />
          </div>
        </section>

        <section>
          <SectionTitle>Financeiro — {mesLabel}</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Receita confirmada</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900">{brl(receitaMes)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Receita prevista</p>
              <p className="mt-1 text-3xl font-bold text-zinc-400">{brl(receitaPrevista)}</p>
              {receitaPrevista > 0 && (
                <p className="mt-1 text-xs text-zinc-400">
                  {((receitaMes / receitaPrevista) * 100).toFixed(0)}% recebido
                </p>
              )}
            </div>
          </div>
        </section>

        {cursos.length > 0 && (
          <section>
            <SectionTitle>Por curso</SectionTitle>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Curso</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Turmas</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Alunos</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Bol. vencidos</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Mensalidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cursos.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{c.nome}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{c.totalTurmas}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{c.totalAlunos}</td>
                      <td className="px-4 py-3 text-right">
                        {c.boletosVencidos > 0 ? (
                          <Link href="/financeiro?status=VENCIDO" className="font-medium text-red-600 hover:underline">
                            {c.boletosVencidos}
                          </Link>
                        ) : <span className="text-zinc-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {c.valorMensalidade != null ? brl(c.valorMensalidade) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {totalPendentes > 0 && alunosPendentes.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle className="mb-0">Pendentes de aprovação</SectionTitle>
              <Link href="/cadastros/alunos" className="text-xs text-zinc-400 hover:text-zinc-700 hover:underline">
                Ver todos →
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
              <ul className="divide-y divide-amber-100">
                {alunosPendentes.map(a => (
                  <li key={a.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{a.nome}</p>
                      <p className="text-xs text-zinc-400">{a.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-zinc-400">{a.createdAt.toLocaleDateString('pt-BR')}</p>
                      <Link href="/cadastros/alunos" className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50">
                        Aprovar
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Ações rápidas</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <QuickLink href="/cadastros/alunos" label="Alunos" />
            <QuickLink href="/financeiro" label="Financeiro" />
            <QuickLink href="/turmas" label="Turmas" />
            <QuickLink href="/cursos" label="Cursos" />
            <QuickLink href="/matriculas" label="Matrículas" />
          </div>
        </section>
      </div>
    )
  }

  // ── FINANCEIRA ───────────────────────────────────────────────────────────────
  if (role === 'FINANCEIRA') {
    const inicioHoje = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const em7Dias    = new Date(inicioHoje.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [kpis, proximosVencimentos] = await Promise.all([
      getFinanceiraKPIs(inicioMes.toISOString(), fimMes.toISOString()),
      prisma.boleto.findMany({
        where: { status: 'PENDENTE', dataVencimento: { gte: inicioHoje, lte: em7Dias } },
        orderBy: { dataVencimento: 'asc' },
        take: 10,
        select: {
          id: true, valor: true, dataVencimento: true,
          aluno: { select: { nome: true } },
          curso:  { select: { nome: true } },
        },
      }),
    ])

    const { inadimplentes, totalVencidoAgg, receitaMesAgg, receitaPrevistaAgg, boletosPorStatus } = kpis
    const totalVencido    = Number(totalVencidoAgg._sum.valor    ?? 0)
    const receitaMes      = Number(receitaMesAgg._sum.valor      ?? 0)
    const receitaPrevista = Number(receitaPrevistaAgg._sum.valor ?? 0)

    const statusCount = Object.fromEntries(boletosPorStatus.map(b => [b.status, b._count._all]))
    const bPendente = statusCount['PENDENTE'] ?? 0
    const bPago     = statusCount['PAGO']     ?? 0
    const bVencido  = statusCount['VENCIDO']  ?? 0

    return (
      <div className="mx-auto max-w-5xl space-y-8">
        {pageHeader}

        <section>
          <SectionTitle>Boletos — {mesLabel}</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Pendentes" value={bPendente} variant={bPendente > 0 ? 'warning' : 'default'} href="/financeiro?status=PENDENTE" />
            <StatCard label="Pagos" value={bPago} href="/financeiro?status=PAGO" />
            <StatCard label="Vencidos" value={bVencido} variant={bVencido > 0 ? 'danger' : 'default'} href="/financeiro?status=VENCIDO" />
            <StatCard label="Receita confirmada" value={brl(receitaMes)} href="/financeiro?status=PAGO" />
          </div>
        </section>

        <section>
          <SectionTitle>Inadimplência acumulada</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Alunos inadimplentes" value={inadimplentes} variant={inadimplentes > 0 ? 'danger' : 'default'} href="/financeiro?status=VENCIDO" />
            <StatCard label="Total em atraso" value={brl(totalVencido)} variant={totalVencido > 0 ? 'danger' : 'default'} href="/financeiro?status=VENCIDO" />
          </div>
        </section>

        {receitaPrevista > 0 && (
          <section>
            <SectionTitle>Cobertura do mês</SectionTitle>
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-zinc-900">{brl(receitaMes)}</p>
                  <p className="mt-1 text-sm text-zinc-500">de {brl(receitaPrevista)} previstos</p>
                </div>
                <p className="text-2xl font-bold text-zinc-400">
                  {((receitaMes / receitaPrevista) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min((receitaMes / receitaPrevista) * 100, 100)}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {proximosVencimentos.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle className="mb-0">Vencendo em 7 dias</SectionTitle>
              <Link href="/financeiro?status=PENDENTE" className="text-xs text-zinc-400 hover:text-zinc-700 hover:underline">
                Ver todos →
              </Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Aluno</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Curso</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Valor</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {proximosVencimentos.map(b => (
                    <tr key={b.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{b.aluno.nome}</td>
                      <td className="px-4 py-3 text-zinc-500">{b.curso.nome}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{brl(Number(b.valor))}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">
                        {b.dataVencimento.toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Ações rápidas</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink href="/financeiro" label="Financeiro" />
            <QuickLink href="/financeiro?status=VENCIDO" label="Inadimplentes" />
          </div>
        </section>
      </div>
    )
  }

  // ── COORDENADOR ──────────────────────────────────────────────────────────────
  if (role === 'COORDENADOR') {
    const [kpis, matriculasPendentes] = await Promise.all([
      getCoordenadorKPIs(inicioMes.toISOString(), fimMes.toISOString()),
      prisma.matricula.findMany({
        where: { status: 'PENDENTE' },
        take: 10,
        orderBy: { dataInicio: 'asc' },
        select: {
          id: true, dataInicio: true,
          aluno:   { select: { nome: true } },
          materia: { select: { nome: true, turma: { select: { nome: true, curso: { select: { nome: true } } } } } },
        },
      }),
    ])

    const { totalAtivos, totalPendentes, totalPresencas, presentesCount, cursosData } = kpis
    const frequenciaMedia = totalPresencas > 0 ? (presentesCount / totalPresencas) * 100 : null

    const cursos = cursosData.map(c => ({
      id: c.id, nome: c.nome,
      totalTurmas: c._count.turmas,
      totalAlunos: new Set(c.turmas.flatMap(t => t.materias.flatMap(m => m.matriculas.map(mat => mat.alunoId)))).size,
    }))

    return (
      <div className="mx-auto max-w-5xl space-y-8">
        {pageHeader}

        <section>
          <SectionTitle>Acadêmico</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Alunos ativos" value={totalAtivos} />
            <StatCard
              label="Aguardando aprovação"
              value={totalPendentes}
              variant={totalPendentes > 0 ? 'warning' : 'default'}
              href="/cadastros/alunos"
            />
            {frequenciaMedia !== null && (
              <StatCard
                label={`Frequência — ${mesLabel}`}
                value={`${frequenciaMedia.toFixed(0)}%`}
                variant={frequenciaMedia < 75 ? 'danger' : frequenciaMedia < 85 ? 'warning' : 'default'}
              />
            )}
          </div>
        </section>

        {cursos.length > 0 && (
          <section>
            <SectionTitle>Por curso</SectionTitle>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Curso</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Turmas</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Alunos ativos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cursos.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{c.nome}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{c.totalTurmas}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{c.totalAlunos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {matriculasPendentes.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle className="mb-0">Matrículas pendentes</SectionTitle>
              <Link href="/matriculas" className="text-xs text-zinc-400 hover:text-zinc-700 hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
              <ul className="divide-y divide-amber-100">
                {matriculasPendentes.map(m => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{m.aluno.nome}</p>
                      <p className="text-xs text-zinc-400">
                        {m.materia.turma.curso.nome} · {m.materia.turma.nome} · {m.materia.nome}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-zinc-400">
                      {m.dataInicio.toLocaleDateString('pt-BR')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Ações rápidas</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <QuickLink href="/cadastros/alunos" label="Alunos" />
            <QuickLink href="/turmas" label="Turmas" />
            <QuickLink href="/cursos" label="Cursos" />
            <QuickLink href="/matriculas" label="Matrículas" />
          </div>
        </section>
      </div>
    )
  }

  // ── PROFESSOR ────────────────────────────────────────────────────────────────
  if (role === 'PROFESSOR') {
    const materias = await prisma.materia.findMany({
      where: { instrutorId: userId },
      orderBy: { nome: 'asc' },
      select: {
        id: true, nome: true,
        turma: { select: { nome: true, curso: { select: { nome: true } } } },
        _count: { select: { matriculas: { where: { status: 'APROVADA' } } } },
      },
    })

    if (materias.length === 0) {
      return (
        <div className="mx-auto max-w-5xl space-y-8">
          {pageHeader}
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-zinc-500">Nenhuma matéria atribuída ainda.</p>
          </div>
        </div>
      )
    }

    const materiaIds = materias.map(m => m.id)

    const [matriculasPendentes, ultimasAulas, totaisPorAluno, presentesPorAluno] = await Promise.all([
      prisma.matricula.findMany({
        where: { status: 'PENDENTE', materiaId: { in: materiaIds } },
        take: 10,
        orderBy: { dataInicio: 'asc' },
        select: {
          id: true,
          aluno:   { select: { nome: true } },
          materia: { select: { nome: true } },
        },
      }),
      // Latest chamada date per matéria
      prisma.presenca.findMany({
        where: { materiaId: { in: materiaIds } },
        select: { materiaId: true, data: true },
        orderBy: { data: 'desc' },
        distinct: ['materiaId'],
      }),
      prisma.presenca.groupBy({
        by: ['alunoId', 'materiaId'],
        where: { materiaId: { in: materiaIds } },
        _count: { _all: true },
      }),
      prisma.presenca.groupBy({
        by: ['alunoId', 'materiaId'],
        where: { materiaId: { in: materiaIds }, status: { in: ['PRESENTE', 'ATRASADO'] } },
        _count: { _all: true },
      }),
    ])

    const ultimaAulaMap = new Map(ultimasAulas.map(p => [p.materiaId, p.data]))

    // Presenca.materiaId is String? in schema, so groupBy types it string | null.
    // Our where clause (materiaId: { in: materiaIds }) ensures no nulls — safe to cast.
    const presenteMap = new Map(
      presentesPorAluno.map(p => [`${p.alunoId}-${p.materiaId as string}`, p._count._all])
    )

    // Students with frequency < 75% (minimum 5 classes to avoid false positives)
    const criticos = totaisPorAluno
      .filter(t => t.materiaId !== null && (() => {
        const np = presenteMap.get(`${t.alunoId}-${t.materiaId}`) ?? 0
        return t._count._all >= 5 && np / t._count._all < 0.75
      })())
      .map(t => ({
        alunoId:    t.alunoId,
        materiaId:  t.materiaId as string,
        frequencia: Math.round(((presenteMap.get(`${t.alunoId}-${t.materiaId}`) ?? 0) / t._count._all) * 100),
      }))
      .sort((a, b) => a.frequencia - b.frequencia)
      .slice(0, 8)

    // Batch-fetch names for critical students
    let criticosComNomes: { alunoNome: string; materiaNome: string; frequencia: number }[] = []
    if (criticos.length > 0) {
      const alunoIds = [...new Set(criticos.map(c => c.alunoId))]
      const alunosDB = await prisma.aluno.findMany({
        where: { id: { in: alunoIds } },
        select: { id: true, nome: true },
      })
      const alunoMap   = new Map(alunosDB.map(a => [a.id, a.nome]))
      const materiaMap = new Map(materias.map(m => [m.id, m.nome]))
      criticosComNomes = criticos.map(c => ({
        alunoNome:   alunoMap.get(c.alunoId)   ?? '—',
        materiaNome: materiaMap.get(c.materiaId) ?? '—',
        frequencia:  c.frequencia,
      }))
    }

    return (
      <div className="mx-auto max-w-5xl space-y-8">
        {pageHeader}

        <section>
          <SectionTitle>Minhas matérias</SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Matéria</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Turma / Curso</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Alunos</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Última aula</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {materias.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{m.nome}</td>
                    <td className="px-4 py-3 text-zinc-500">{m.turma.nome} · {m.turma.curso.nome}</td>
                    <td className="px-4 py-3 text-right text-zinc-600">{m._count.matriculas}</td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {ultimaAulaMap.get(m.id)?.toLocaleDateString('pt-BR') ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {matriculasPendentes.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle className="mb-0">Matrículas aguardando aprovação</SectionTitle>
              <Link href="/minhas-materias" className="text-xs text-zinc-400 hover:text-zinc-700 hover:underline">
                Ir para matérias →
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
              <ul className="divide-y divide-amber-100">
                {matriculasPendentes.map(m => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{m.aluno.nome}</p>
                      <p className="text-xs text-zinc-400">{m.materia.nome}</p>
                    </div>
                    <Link
                      href="/minhas-materias"
                      className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                    >
                      Aprovar
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {criticosComNomes.length > 0 && (
          <section>
            <SectionTitle>Alunos com frequência crítica (&lt;75%)</SectionTitle>
            <div className="overflow-x-auto rounded-xl border border-red-100 bg-red-50">
              <table className="w-full text-sm">
                <thead className="border-b border-red-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-red-400">Aluno</th>
                    <th className="px-4 py-3 text-left font-medium text-red-400">Matéria</th>
                    <th className="px-4 py-3 text-right font-medium text-red-400">Frequência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {criticosComNomes.map((c, i) => (
                    <tr key={i} className="hover:bg-red-100/50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{c.alunoNome}</td>
                      <td className="px-4 py-3 text-zinc-500">{c.materiaNome}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">{c.frequencia}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section>
          <SectionTitle>Ações rápidas</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <QuickLink href="/minhas-materias" label="Minhas matérias" />
            <QuickLink href="/turmas" label="Turmas" />
          </div>
        </section>
      </div>
    )
  }

  // ── ALUNO ────────────────────────────────────────────────────────────────────
  const [
    matriculasAprovadas,
    presencasTotais,
    presencasPresentes,
    boletosVencidos,
    proximoBoleto,
    matriculasPendentes,
  ] = await Promise.all([
    prisma.matricula.findMany({
      where: { alunoId: userId, status: 'APROVADA' },
      orderBy: { dataInicio: 'asc' },
      include: {
        materia: { include: { turma: { include: { curso: true } } } },
        notas:   { select: { valor: true } },
      },
    }),
    prisma.presenca.groupBy({
      by: ['materiaId'],
      where: { alunoId: userId },
      _count: { _all: true },
    }),
    prisma.presenca.groupBy({
      by: ['materiaId'],
      where: { alunoId: userId, status: { in: ['PRESENTE', 'ATRASADO'] } },
      _count: { _all: true },
    }),
    prisma.boleto.findMany({
      where: { alunoId: userId, status: 'VENCIDO' },
      orderBy: { dataVencimento: 'asc' },
      include: { curso: { select: { nome: true } } },
    }),
    prisma.boleto.findFirst({
      where: { alunoId: userId, status: 'PENDENTE' },
      orderBy: { dataVencimento: 'asc' },
      include: { curso: { select: { nome: true } } },
    }),
    prisma.matricula.findMany({
      where: { alunoId: userId, status: 'PENDENTE' },
      include: { materia: { include: { turma: { include: { curso: true } } } } },
    }),
  ])

  const totalMap   = new Map(presencasTotais.map(p => [p.materiaId, p._count._all]))
  const presenteMap = new Map(presencasPresentes.map(p => [p.materiaId, p._count._all]))

  const materiaStats = matriculasAprovadas.map(mat => {
    const total    = totalMap.get(mat.materiaId) ?? 0
    const presentes = presenteMap.get(mat.materiaId) ?? 0
    const frequencia = total > 0 ? Math.round((presentes / total) * 100) : null
    const media      = mat.notas.length > 0
      ? mat.notas.reduce((s, n) => s + Number(n.valor), 0) / mat.notas.length
      : null
    return { ...mat, frequencia, media }
  })

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {pageHeader}

      {boletosVencidos.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-700">
            {boletosVencidos.length === 1
              ? 'Você tem 1 boleto vencido.'
              : `Você tem ${boletosVencidos.length} boletos vencidos.`}
          </p>
          <ul className="mt-2 space-y-1">
            {boletosVencidos.map(b => (
              <li key={b.id} className="flex justify-between text-sm text-red-600">
                <span>{b.curso.nome} — venceu em {b.dataVencimento.toLocaleDateString('pt-BR')}</span>
                <span className="font-medium">{brl(Number(b.valor))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {proximoBoleto && (
        <section>
          <SectionTitle>Próximo pagamento</SectionTitle>
          <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4">
            <div>
              <p className="font-medium text-zinc-900">{proximoBoleto.curso.nome}</p>
              <p className="text-sm text-zinc-400">
                Vence em {proximoBoleto.dataVencimento.toLocaleDateString('pt-BR')}
              </p>
            </div>
            <p className="text-xl font-bold text-zinc-900">{brl(Number(proximoBoleto.valor))}</p>
          </div>
        </section>
      )}

      {matriculasPendentes.length > 0 && (
        <section>
          <SectionTitle>Matrículas aguardando aprovação</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50">
            <ul className="divide-y divide-amber-100">
              {matriculasPendentes.map(m => (
                <li key={m.id} className="px-4 py-3">
                  <p className="text-sm font-medium text-zinc-900">{m.materia.nome}</p>
                  <p className="text-xs text-zinc-400">
                    {m.materia.turma.curso.nome} · {m.materia.turma.nome}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {materiaStats.length > 0 && (
        <section>
          <SectionTitle>Minhas matérias</SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Matéria</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Curso</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Frequência</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Média</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {materiaStats.map(m => (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{m.materia.nome}</td>
                    <td className="px-4 py-3 text-zinc-500">{m.materia.turma.curso.nome}</td>
                    <td className="px-4 py-3 text-right">
                      {m.frequencia !== null ? (
                        <span className={
                          m.frequencia < 75 ? 'font-bold text-red-600'
                          : m.frequencia < 85 ? 'text-amber-600'
                          : 'text-zinc-600'
                        }>
                          {m.frequencia}%
                        </span>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.media !== null ? (
                        <span className={
                          m.media < 5 ? 'font-bold text-red-600'
                          : m.media < 7 ? 'text-amber-600'
                          : 'text-zinc-600'
                        }>
                          {m.media.toFixed(1)}
                        </span>
                      ) : <span className="text-zinc-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {materiaStats.length === 0 && matriculasPendentes.length === 0 && !proximoBoleto && (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-500">Nenhuma matrícula ainda. Explore os cursos disponíveis.</p>
          <Link href="/matriculas" className="mt-3 inline-block text-sm font-medium text-zinc-700 hover:underline">
            Ver matrículas →
          </Link>
        </div>
      )}

      <section>
        <SectionTitle>Ações rápidas</SectionTitle>
        <QuickLink href="/matriculas" label="Minhas matrículas" />
      </section>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function brl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400 ${className}`}>
      {children}
    </h2>
  )
}

type Variant = 'default' | 'warning' | 'danger'

const variantStyles: Record<Variant, { card: string; value: string }> = {
  default: { card: 'border-zinc-200 bg-white',  value: 'text-zinc-900' },
  warning: { card: 'border-amber-200 bg-amber-50', value: 'text-amber-700' },
  danger:  { card: 'border-red-200 bg-red-50',  value: 'text-red-600' },
}

function StatCard({
  label, value, variant = 'default', href,
}: {
  label: string; value: string | number; variant?: Variant; href?: string
}) {
  const { card, value: valueColor } = variantStyles[variant]
  const inner = (
    <div className={`rounded-xl border p-4 transition-colors ${card} ${href ? 'hover:opacity-80' : ''}`}>
      <p className={`truncate text-xl font-bold sm:text-2xl ${valueColor}`}>{value}</p>
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
