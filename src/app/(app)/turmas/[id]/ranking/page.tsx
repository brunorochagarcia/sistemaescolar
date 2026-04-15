import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirAcademico } from '@/lib/auth/permissions'
import { calcularMediaMateria, calcularMediaTurma } from '@/lib/calculo/media'
import { FrequenciaBadge } from '@/components/frequencia-badge'
import Link from 'next/link'

export const metadata = { title: 'Ranking — Sistema Escolar' }

export default async function RankingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirAcademico(session.user.role)) redirect('/dashboard')

  const { id } = await params

  const [turma, matriculas, presencas] = await Promise.all([
    prisma.turma.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        anoLetivo: true,
        curso: { select: { nome: true } },
        materias: {
          orderBy: { nome: 'asc' },
          select: { id: true, nome: true },
        },
      },
    }),
    prisma.matricula.findMany({
      where: { status: 'APROVADA', materia: { turmaId: id } },
      select: {
        alunoId: true,
        materiaId: true,
        aluno: { select: { id: true, nome: true, numeroCadastro: true } },
        notas: { select: { valor: true } },
      },
    }),
    prisma.presenca.findMany({
      where: { materia: { turmaId: id } },
      select: { alunoId: true, status: true },
    }),
  ])

  if (!turma) notFound()

  // ── Montar mapa aluno → dados ──────────────────────────────────────────────

  const alunoMap = new Map<
    string,
    {
      id: string
      nome: string
      numeroCadastro: string | null
      notasPorMateria: Map<string, number[]>
      presencaTotal: number
      presencaPresente: number
    }
  >()

  for (const m of matriculas) {
    if (!alunoMap.has(m.alunoId)) {
      alunoMap.set(m.alunoId, {
        id: m.aluno.id,
        nome: m.aluno.nome,
        numeroCadastro: m.aluno.numeroCadastro,
        notasPorMateria: new Map(),
        presencaTotal: 0,
        presencaPresente: 0,
      })
    }
    alunoMap.get(m.alunoId)!.notasPorMateria.set(
      m.materiaId,
      m.notas.map((n) => Number(n.valor)),
    )
  }

  for (const p of presencas) {
    const entry = alunoMap.get(p.alunoId)
    if (!entry) continue
    entry.presencaTotal++
    if (p.status === 'PRESENTE' || p.status === 'ATRASADO') entry.presencaPresente++
  }

  // ── Calcular e ordenar ─────────────────────────────────────────────────────

  const rows = Array.from(alunoMap.values()).map((a) => {
    const notasPorMateria = turma.materias.map((m) => a.notasPorMateria.get(m.id) ?? [])
    const mediaGeral = calcularMediaTurma(notasPorMateria)
    const frequencia =
      a.presencaTotal > 0 ? (a.presencaPresente / a.presencaTotal) * 100 : null

    return {
      id: a.id,
      nome: a.nome,
      numeroCadastro: a.numeroCadastro,
      mediasMateria: turma.materias.map((m, i) => ({
        materiaId: m.id,
        media: calcularMediaMateria(notasPorMateria[i]),
      })),
      mediaGeral,
      frequencia,
    }
  })

  // Ordenar por média geral desc, sem notas vai para o final
  rows.sort((a, b) => {
    if (a.mediaGeral === null && b.mediaGeral === null) return 0
    if (a.mediaGeral === null) return 1
    if (b.mediaGeral === null) return -1
    return b.mediaGeral - a.mediaGeral
  })

  const medalhas = ['🥇', '🥈', '🥉']

  return (
    <div className="mx-auto max-w-6xl">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/turmas" className="hover:text-zinc-900">Turmas</Link>
          <span>/</span>
          <Link href={`/turmas/${id}`} className="hover:text-zinc-900">{turma.nome}</Link>
          <span>/</span>
          <span>Ranking</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Ranking — {turma.nome}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {turma.curso.nome} · {turma.anoLetivo} · {rows.length} aluno{rows.length !== 1 ? 's' : ''}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum aluno matriculado nesta turma.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-center font-medium text-zinc-500">#</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Aluno</th>
                {turma.materias.map((m) => (
                  <th
                    key={m.id}
                    className="px-3 py-3 text-center font-medium text-zinc-500"
                    title={m.nome}
                  >
                    <span className="block max-w-[100px] truncate" title={m.nome}>
                      {m.nome}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-zinc-500">Média</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-500">Frequência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row, i) => {
                const pos = i + 1
                const medalha = medalhas[i] ?? null
                const mediaColor =
                  row.mediaGeral === null
                    ? 'text-zinc-300'
                    : row.mediaGeral >= 7
                      ? 'text-green-600'
                      : 'text-red-500'

                return (
                  <tr key={row.id} className={i < 3 && row.mediaGeral !== null ? 'bg-brand-light/10' : 'hover:bg-zinc-50'}>
                    {/* Posição */}
                    <td className="px-4 py-3 text-center">
                      {medalha ? (
                        <span className="text-base">{medalha}</span>
                      ) : (
                        <span className="text-xs font-medium text-zinc-400">{pos}º</span>
                      )}
                    </td>

                    {/* Aluno */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/alunos/${row.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {row.nome}
                      </Link>
                      {row.numeroCadastro && (
                        <p className="mt-0.5 font-mono text-xs text-zinc-400">
                          {row.numeroCadastro}
                        </p>
                      )}
                    </td>

                    {/* Média por matéria */}
                    {row.mediasMateria.map((mm) => (
                      <td key={mm.materiaId} className="px-3 py-3 text-center">
                        {mm.media !== null ? (
                          <span
                            className={`font-medium ${mm.media >= 7 ? 'text-green-600' : 'text-red-500'}`}
                          >
                            {mm.media.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    ))}

                    {/* Média geral */}
                    <td className="px-4 py-3 text-center">
                      {row.mediaGeral !== null ? (
                        <span className={`text-base font-bold ${mediaColor}`}>
                          {row.mediaGeral.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>

                    {/* Frequência */}
                    <td className="px-4 py-3 text-center">
                      {row.frequencia !== null ? (
                        <FrequenciaBadge percentual={row.frequencia} />
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
        <span>Média ≥ 7.0 → aprovado</span>
        <span>· Frequência mínima: 75%</span>
        <span>· Ordenado por média geral (maior → menor)</span>
      </div>
    </div>
  )
}
