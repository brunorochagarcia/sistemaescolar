import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirMateria, podeAprovarAluno } from '@/lib/auth/permissions'
import { FrequenciaBadge } from '@/components/frequencia-badge'
import Link from 'next/link'
import type { StatusPresenca } from '@/generated/prisma/enums'

export const metadata = { title: 'Frequência — Sistema Escolar' }

const statusConfig: Record<StatusPresenca, { label: string; className: string }> = {
  PRESENTE: { label: 'Presente', className: 'bg-green-100 text-green-700' },
  ATRASADO: { label: 'Atrasado', className: 'bg-amber-100 text-amber-700' },
  AUSENTE:  { label: 'Falta',    className: 'bg-red-100 text-red-600' },
}

export default async function FrequenciaAlunoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ano?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirMateria(session.user.role) && !podeAprovarAluno(session.user.role)) {
    redirect('/dashboard')
  }

  const [{ id }, { ano: anoParam }] = await Promise.all([params, searchParams])

  // ─── Buscar aluno + todas as queries em paralelo ───────────────────────────
  const aluno = await prisma.aluno.findUnique({
    where: { id },
    select: { id: true, nome: true, numeroCadastro: true, alertaEnviado: true },
  })
  if (!aluno) notFound()

  // Contagens gerais (leves — usam índice em alunoId)
  const [total, presentes, primeiraPresenca, ultimaPresenca] = await Promise.all([
    prisma.presenca.count({ where: { alunoId: id } }),
    prisma.presenca.count({ where: { alunoId: id, status: { in: ['PRESENTE', 'ATRASADO'] } } }),
    prisma.presenca.findFirst({
      where: { alunoId: id },
      orderBy: { data: 'asc' },
      select: { data: true },
    }),
    prisma.presenca.findFirst({
      where: { alunoId: id },
      orderBy: { data: 'desc' },
      select: { data: true },
    }),
  ])

  const percentualGeral = total > 0 ? (presentes / total) * 100 : 0

  // Anos disponíveis para o seletor
  const anoAtual = new Date().getFullYear()
  const anoInicio = primeiraPresenca?.data.getFullYear() ?? anoAtual
  const anosDisponiveis = Array.from(
    { length: anoAtual - anoInicio + 1 },
    (_, i) => anoAtual - i,
  )

  // Default to the most recent year with actual data, not the current calendar year
  const anoDefault = ultimaPresenca?.data.getFullYear() ?? anoAtual
  const ano = anoParam ? parseInt(anoParam) : anoDefault
  const inicioAno = new Date(Date.UTC(ano, 0, 1))
  const fimAno = new Date(Date.UTC(ano + 1, 0, 1))

  // Resumo por escopo via groupBy — sem carregar todos os registros
  const [totalPorEscopo, presentesPorEscopo] = await Promise.all([
    prisma.presenca.groupBy({
      by: ['turmaId', 'materiaId'],
      where: { alunoId: id },
      _count: { _all: true },
    }),
    prisma.presenca.groupBy({
      by: ['turmaId', 'materiaId'],
      where: { alunoId: id, status: { in: ['PRESENTE', 'ATRASADO'] } },
      _count: { _all: true },
    }),
  ])

  // Nomes dos escopos (batch — apenas IDs únicos)
  const turmaIds = [...new Set(totalPorEscopo.map((e) => e.turmaId).filter(Boolean))] as string[]
  const materiaIds = [...new Set(totalPorEscopo.map((e) => e.materiaId).filter(Boolean))] as string[]

  const [turmas, materias] = await Promise.all([
    turmaIds.length
      ? prisma.turma.findMany({ where: { id: { in: turmaIds } }, select: { id: true, nome: true } })
      : [],
    materiaIds.length
      ? prisma.materia.findMany({ where: { id: { in: materiaIds } }, select: { id: true, nome: true } })
      : [],
  ])

  const turmaMap = Object.fromEntries(turmas.map((t) => [t.id, t.nome]))
  const materiaMap = Object.fromEntries(materias.map((m) => [m.id, m.nome]))
  const presentesMap = Object.fromEntries(
    presentesPorEscopo.map((e) => [`${e.turmaId ?? ''}-${e.materiaId ?? ''}`, e._count._all]),
  )

  const escopos = totalPorEscopo.map((e) => {
    const key = `${e.turmaId ?? ''}-${e.materiaId ?? ''}`
    const label = e.materiaId
      ? (materiaMap[e.materiaId] ?? '—')
      : e.turmaId
        ? (turmaMap[e.turmaId] ?? '—')
        : 'Geral'
    return {
      label,
      total: e._count._all,
      presentes: presentesMap[key] ?? 0,
    }
  })

  // Histórico do ano selecionado — paginado por ano, usa índice (alunoId, data)
  const historico = await prisma.presenca.findMany({
    where: { alunoId: id, data: { gte: inicioAno, lt: fimAno } },
    orderBy: { data: 'desc' },
    select: {
      id: true,
      data: true,
      status: true,
      turmaId: true,
      materiaId: true,
    },
  })

  const canNotify =
    (session.user.role === 'DIRETOR' || session.user.role === 'COORDENADOR') &&
    percentualGeral < 75 &&
    total > 0

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/cadastros/alunos" className="hover:text-zinc-900">Alunos</Link>
          <span>/</span>
          <Link href={`/alunos/${id}`} className="hover:text-zinc-900">{aluno.nome}</Link>
          <span>/</span>
          <span>Frequência</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Frequência — {aluno.nome}</h1>
          {canNotify && <NotificarButton alunoId={id} alertaJaEnviado={aluno.alertaEnviado} />}
        </div>
      </div>

      {/* Resumo geral */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-zinc-900">{total}</p>
          <p className="text-sm text-zinc-500">Registros totais</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{presentes}</p>
          <p className="text-sm text-zinc-500">Presença / Atraso</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            {total > 0 ? (
              <FrequenciaBadge percentual={percentualGeral} />
            ) : (
              <span className="text-sm text-zinc-400">—</span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500">Frequência geral</p>
        </div>
      </div>

      {/* Frequência por matéria/turma */}
      {escopos.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700">Por matéria / turma</h3>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Escopo</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-zinc-400">Aulas</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-zinc-400">Presenças</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Frequência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {escopos.map((entry, i) => {
                  const pct = (entry.presentes / entry.total) * 100
                  return (
                    <tr key={i} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 font-medium text-zinc-900">{entry.label}</td>
                      <td className="px-4 py-2 text-center text-zinc-500">{entry.total}</td>
                      <td className="px-4 py-2 text-center text-zinc-500">{entry.presentes}</td>
                      <td className="px-4 py-2 text-right">
                        <FrequenciaBadge percentual={pct} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Histórico paginado por ano */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">
          Histórico — {historico.length} registro{historico.length !== 1 ? 's' : ''} em {ano}
        </h3>
        {anosDisponiveis.length > 1 && (
          <div className="flex items-center gap-1">
            {anosDisponiveis.map((a) => (
              <Link
                key={a}
                href={`/alunos/${id}/frequencia?ano=${a}`}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  a === ano
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                {a}
              </Link>
            ))}
          </div>
        )}
      </div>

      {historico.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center">
          <p className="text-zinc-500">Nenhum registro em {ano}.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Data</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Escopo</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {historico.map((p) => {
                const cfg = statusConfig[p.status]
                const label = p.materiaId
                  ? (materiaMap[p.materiaId] ?? '—')
                  : p.turmaId
                    ? (turmaMap[p.turmaId] ?? '—')
                    : '—'
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-700">
                      {p.data.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">{label}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                      </span>
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

// ─── Client Component inline para o botão de notificação ─────────────────────
import { NotificarAlunoButton } from '@/components/notificar-aluno-button'

function NotificarButton({ alunoId, alertaJaEnviado }: { alunoId: string; alertaJaEnviado: boolean }) {
  return <NotificarAlunoButton alunoId={alunoId} alertaJaEnviado={alertaJaEnviado} />
}
