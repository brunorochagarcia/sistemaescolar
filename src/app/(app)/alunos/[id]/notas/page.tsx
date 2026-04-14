import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirMateria, podeAprovarAluno } from '@/lib/auth/permissions'
import { calcularMediaMateria, calcularMediaTurma } from '@/lib/calculo/media'
import { calcularSituacao } from '@/lib/calculo/situacao'
import { SituacaoBadge } from '@/components/situacao-badge'
import Link from 'next/link'

export const metadata = { title: 'Boletim — Sistema Escolar' }

export default async function BoletimAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  // PROFESSOR e coordenação/direção podem ver o boletim
  if (!podeGerirMateria(session.user.role) && !podeAprovarAluno(session.user.role)) {
    redirect('/dashboard')
  }

  const { id } = await params

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      numeroCadastro: true,
      matriculas: {
        where: { status: 'APROVADA' },
        orderBy: { materia: { nome: 'asc' } },
        select: {
          id: true,
          materia: {
            select: {
              id: true,
              nome: true,
              turma: {
                select: {
                  id: true,
                  nome: true,
                  curso: { select: { id: true, nome: true } },
                },
              },
            },
          },
          notas: {
            orderBy: { data: 'asc' },
            select: { id: true, valor: true, descricao: true, data: true },
          },
        },
      },
    },
  })
  if (!aluno) notFound()

  // Agrupar matrículas por Curso → Turma
  const porCurso = new Map<
    string,
    {
      cursoNome: string
      turmas: Map<
        string,
        {
          turmaId: string
          turmaNome: string
          materias: Array<{
            matriculaId: string
            materiaNome: string
            notas: Array<{ id: string; valor: number; descricao: string; data: Date }>
            media: number | null
          }>
        }
      >
    }
  >()

  for (const m of aluno.matriculas) {
    const { curso, id: turmaId, nome: turmaNome } = m.materia.turma
    const cursoId = curso.id

    if (!porCurso.has(cursoId)) {
      porCurso.set(cursoId, { cursoNome: curso.nome, turmas: new Map() })
    }
    const cursoEntry = porCurso.get(cursoId)!

    if (!cursoEntry.turmas.has(turmaId)) {
      cursoEntry.turmas.set(turmaId, { turmaId, turmaNome, materias: [] })
    }
    const turmaEntry = cursoEntry.turmas.get(turmaId)!

    const notasBrutas = m.notas.map((n) => ({
      id: n.id,
      valor: Number(n.valor),
      descricao: n.descricao,
      data: n.data,
    }))
    const media = calcularMediaMateria(notasBrutas.map((n) => n.valor))

    turmaEntry.materias.push({
      matriculaId: m.id,
      materiaNome: m.materia.nome,
      notas: notasBrutas,
      media,
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/cadastros/alunos" className="hover:text-zinc-900">Alunos</Link>
          <span>/</span>
          <Link href={`/alunos/${id}`} className="hover:text-zinc-900">{aluno.nome}</Link>
          <span>/</span>
          <span>Boletim</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900">Boletim — {aluno.nome}</h1>
          {aluno.numeroCadastro && (
            <span className="font-mono text-sm text-zinc-400">{aluno.numeroCadastro}</span>
          )}
        </div>
      </div>

      {porCurso.size === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Aluno não possui matrículas aprovadas.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(porCurso.entries()).map(([cursoId, { cursoNome, turmas }]) => (
            <div key={cursoId}>
              <h2 className="mb-3 text-lg font-semibold text-zinc-800">{cursoNome}</h2>

              <div className="space-y-4">
                {Array.from(turmas.entries()).map(([turmaId, { turmaNome, materias }]) => {
                  const mediasTurma = materias.map((m) =>
                    m.notas.map((n) => n.valor)
                  )
                  const mediaTurma = calcularMediaTurma(mediasTurma)

                  return (
                    <div key={turmaId} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                        <p className="font-medium text-zinc-900">{turmaNome}</p>
                        {mediaTurma !== null && (
                          <span className={`text-sm font-semibold ${mediaTurma >= 7 ? 'text-green-600' : 'text-red-500'}`}>
                            Média turma: {mediaTurma.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <table className="w-full text-sm">
                        <thead className="border-b border-zinc-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Matéria</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Notas</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Média</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-zinc-400">Situação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {materias.map((m) => {
                            // Sem campo 'encerrada' no schema — tratamos como em andamento
                            const situacao = calcularSituacao(m.media, false)
                            return (
                              <tr key={m.matriculaId} className="hover:bg-zinc-50">
                                <td className="px-4 py-3 font-medium text-zinc-900">{m.materiaNome}</td>
                                <td className="px-4 py-3 text-zinc-500">
                                  {m.notas.length === 0 ? (
                                    <span className="text-zinc-300">—</span>
                                  ) : (
                                    <span className="text-xs">
                                      {m.notas.map((n) => n.valor.toFixed(1)).join(', ')}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {m.media !== null ? (
                                    <span className={`font-semibold ${m.media >= 7 ? 'text-green-600' : 'text-red-500'}`}>
                                      {m.media.toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-zinc-300">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <SituacaoBadge situacao={situacao} />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
