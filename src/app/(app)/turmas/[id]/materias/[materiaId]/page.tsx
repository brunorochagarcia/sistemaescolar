import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirMateria } from '@/lib/auth/permissions'
import { calcularMediaMateria } from '@/lib/calculo/media'
import { FrequenciaBadge } from '@/components/frequencia-badge'
import { NotaForm, NotaRow } from '@/components/nota-form'
import Link from 'next/link'

export const metadata = { title: 'Matéria — Sistema Escolar' }

export default async function MateriaDetailPage({
  params,
}: {
  params: Promise<{ id: string; materiaId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirMateria(session.user.role)) redirect('/dashboard')

  const { id: turmaId, materiaId } = await params

  const [materia, presencas] = await Promise.all([
    prisma.materia.findUnique({
      where: { id: materiaId },
      select: {
        id: true,
        nome: true,
        descricao: true,
        turmaId: true,
        turma: { select: { id: true, nome: true } },
        instrutor: { select: { id: true, name: true } },
        matriculas: {
          where: { status: 'APROVADA' },
          orderBy: { aluno: { nome: 'asc' } },
          select: {
            id: true,
            aluno: { select: { id: true, nome: true, numeroCadastro: true } },
            notas: {
              orderBy: { data: 'asc' },
              select: { id: true, valor: true, descricao: true, data: true },
            },
          },
        },
      },
    }),
    prisma.presenca.findMany({
      where: { materiaId },
      select: { alunoId: true, status: true, data: true },
    }),
  ])

  if (!materia || materia.turmaId !== turmaId) notFound()

  const isProfessor = session.user.role === 'PROFESSOR'
  const podeEditar = !isProfessor || materia.instrutor?.id === session.user.id

  // ── Processar presenças ────────────────────────────────────────────────────

  // Datas únicas = aulas registradas
  const datasUnicas = new Set(presencas.map((p) => p.data.toISOString().slice(0, 10)))
  const totalAulas = datasUnicas.size

  // Frequência por aluno
  const presencaPorAluno = new Map<
    string,
    { total: number; presentes: number; faltas: number }
  >()
  for (const p of presencas) {
    if (!presencaPorAluno.has(p.alunoId)) {
      presencaPorAluno.set(p.alunoId, { total: 0, presentes: 0, faltas: 0 })
    }
    const entry = presencaPorAluno.get(p.alunoId)!
    entry.total++
    if (p.status === 'PRESENTE' || p.status === 'ATRASADO') entry.presentes++
    if (p.status === 'AUSENTE') entry.faltas++
  }

  // ── Montar linhas da tabela ────────────────────────────────────────────────

  const linhas = materia.matriculas.map((m) => {
    const valores = m.notas.map((n) => Number(n.valor))
    const media = calcularMediaMateria(valores)
    const freq = presencaPorAluno.get(m.aluno.id)
    const frequencia = freq && freq.total > 0
      ? (freq.presentes / freq.total) * 100
      : null

    return {
      matriculaId: m.id,
      aluno: m.aluno,
      notas: m.notas.map((n) => ({ ...n, valor: Number(n.valor) })),
      media,
      totalAulasAluno: freq?.total ?? 0,
      faltas: freq?.faltas ?? 0,
      frequencia,
    }
  })

  // ── Stats gerais ───────────────────────────────────────────────────────────

  const mediasValidas = linhas.map((l) => l.media).filter((m): m is number => m !== null)
  const mediaTurma =
    mediasValidas.length > 0
      ? mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length
      : null

  const freqsValidas = linhas
    .map((l) => l.frequencia)
    .filter((f): f is number => f !== null)
  const freqMedia =
    freqsValidas.length > 0
      ? freqsValidas.reduce((a, b) => a + b, 0) / freqsValidas.length
      : null

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/turmas" className="hover:text-zinc-900">Turmas</Link>
          <span>/</span>
          <Link href={`/turmas/${turmaId}`} className="hover:text-zinc-900">
            {materia.turma.nome}
          </Link>
          <span>/</span>
          <span>{materia.nome}</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">{materia.nome}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {materia.instrutor ? `Prof. ${materia.instrutor.name}` : 'Sem professor atribuído'}
          {materia.descricao && ` · ${materia.descricao}`}
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-zinc-900">{materia.matriculas.length}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Alunos matriculados</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-zinc-900">{totalAulas}</p>
          <p className="mt-0.5 text-xs text-zinc-500">Aulas registradas</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
          {mediaTurma !== null ? (
            <p className={`text-2xl font-bold ${mediaTurma >= 7 ? 'text-green-600' : 'text-red-500'}`}>
              {mediaTurma.toFixed(1)}
            </p>
          ) : (
            <p className="text-2xl font-bold text-zinc-300">—</p>
          )}
          <p className="mt-0.5 text-xs text-zinc-500">Média da turma</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
          {freqMedia !== null ? (
            <p className={`text-2xl font-bold ${freqMedia >= 75 ? 'text-green-600' : freqMedia >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {freqMedia.toFixed(0)}%
            </p>
          ) : (
            <p className="text-2xl font-bold text-zinc-300">—</p>
          )}
          <p className="mt-0.5 text-xs text-zinc-500">Frequência média</p>
        </div>
      </div>

      {/* Tabela de alunos */}
      {materia.matriculas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum aluno aprovado nesta matéria.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {linhas.map((linha) => (
            <div
              key={linha.matriculaId}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
            >
              {/* Cabeçalho do aluno */}
              <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/alunos/${linha.aluno.id}`}
                    className="font-semibold text-zinc-900 hover:underline"
                  >
                    {linha.aluno.nome}
                  </Link>
                  {linha.aluno.numeroCadastro && (
                    <span className="font-mono text-xs text-zinc-400">
                      {linha.aluno.numeroCadastro}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  {/* Frequência */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span>{linha.totalAulasAluno} aulas</span>
                    {linha.faltas > 0 && (
                      <span className="font-medium text-red-500">
                        · {linha.faltas} falta{linha.faltas !== 1 ? 's' : ''}
                      </span>
                    )}
                    {linha.frequencia !== null && (
                      <FrequenciaBadge percentual={linha.frequencia} />
                    )}
                    {linha.totalAulasAluno === 0 && (
                      <span className="text-zinc-300">sem chamada</span>
                    )}
                  </div>
                  {/* Média */}
                  {linha.media !== null ? (
                    <span
                      className={`font-bold ${linha.media >= 7 ? 'text-green-600' : 'text-red-500'}`}
                    >
                      Média {linha.media.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-zinc-300 text-xs">sem notas</span>
                  )}
                </div>
              </div>

              {/* Notas */}
              <div className="px-5 py-4">
                {linha.notas.length > 0 ? (
                  <div className="mb-3 space-y-1.5 rounded-xl bg-zinc-50 px-3 py-2">
                    {linha.notas.map((nota) => (
                      <NotaRow
                        key={nota.id}
                        notaId={nota.id}
                        valor={nota.valor}
                        descricao={nota.descricao}
                        matriculaId={linha.matriculaId}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-zinc-400">Nenhuma avaliação lançada ainda.</p>
                )}

                {podeEditar && (
                  <NotaForm matriculaId={linha.matriculaId} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
