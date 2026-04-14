import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirMateria } from '@/lib/auth/permissions'
import { ChamadaForm } from '@/components/chamada-form'
import Link from 'next/link'
import type { StatusPresenca } from '@/generated/prisma/enums'

export const metadata = { title: 'Chamada — Sistema Escolar' }

const statusLabels: Record<StatusPresenca, { label: string; className: string }> = {
  PRESENTE: { label: 'P', className: 'bg-green-100 text-green-700' },
  ATRASADO: { label: 'A', className: 'bg-amber-100 text-amber-700' },
  AUSENTE: { label: 'F', className: 'bg-red-100 text-red-600' },
}

export default async function ChamadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ materiaId?: string; data?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirMateria(session.user.role)) redirect('/dashboard')

  const { id: turmaId } = await params
  const { materiaId, data: dataParam } = await searchParams

  const hoje = new Date().toISOString().split('T')[0]
  const dataSelecionada = dataParam ?? hoje

  const isProfessor = session.user.role === 'PROFESSOR'

  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: {
      id: true,
      nome: true,
      materias: {
        where: isProfessor ? { instrutorId: session.user.id } : undefined,
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, instrutorId: true },
      },
    },
  })
  if (!turma) notFound()

  // Matéria selecionada (PROFESSOR obrigatoriamente usa materiaId)
  const materiaAtual = materiaId
    ? turma.materias.find((m) => m.id === materiaId)
    : isProfessor
      ? turma.materias[0]
      : null

  // Alunos com matrícula APROVADA na matéria (se selecionada) ou na turma (admin)
  let alunos: { id: string; nome: string }[] = []
  if (materiaAtual) {
    const matriculas = await prisma.matricula.findMany({
      where: { materiaId: materiaAtual.id, status: 'APROVADA' },
      orderBy: { aluno: { nome: 'asc' } },
      select: { aluno: { select: { id: true, nome: true } } },
    })
    alunos = matriculas.map((m) => m.aluno)
  } else if (!isProfessor) {
    // Coordenador/Diretor: alunos com ao menos uma matrícula APROVADA na turma
    const matriculas = await prisma.matricula.findMany({
      where: { materia: { turmaId }, status: 'APROVADA' },
      orderBy: { aluno: { nome: 'asc' } },
      distinct: ['alunoId'],
      select: { aluno: { select: { id: true, nome: true } } },
    })
    alunos = matriculas.map((m) => m.aluno)
  }

  // Presencas já registradas para este dia
  const dataRef = new Date(`${dataSelecionada}T00:00:00.000Z`)
  const presencasExistentes = await prisma.presenca.findMany({
    where: {
      data: dataRef,
      alunoId: { in: alunos.map((a) => a.id) },
      ...(materiaAtual ? { materiaId: materiaAtual.id } : { turmaId }),
    },
    select: { alunoId: true, status: true },
  })
  const existentesMap = Object.fromEntries(
    presencasExistentes.map((p) => [p.alunoId, p.status])
  ) as Record<string, StatusPresenca>

  // Histórico recente (últimas 10 datas com registros)
  const historico = await prisma.presenca.findMany({
    where: {
      alunoId: { in: alunos.map((a) => a.id) },
      ...(materiaAtual ? { materiaId: materiaAtual.id } : { turmaId }),
    },
    orderBy: { data: 'desc' },
    distinct: ['data'],
    take: 10,
    select: { data: true },
  })
  const datasHistorico = historico.map((h) => h.data.toISOString().split('T')[0])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/turmas" className="hover:text-zinc-900">Turmas</Link>
          <span>/</span>
          <Link href={`/turmas/${turmaId}`} className="hover:text-zinc-900">{turma.nome}</Link>
          <span>/</span>
          <span>Chamada</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Chamada — {turma.nome}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Painel esquerdo: seletores + form */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Seletor de matéria (todos veem) */}
          {turma.materias.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {!isProfessor && (
                <Link
                  href={`/turmas/${turmaId}/chamada?data=${dataSelecionada}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    !materiaId
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  Turma inteira
                </Link>
              )}
              {turma.materias.map((m) => (
                <Link
                  key={m.id}
                  href={`/turmas/${turmaId}/chamada?materiaId=${m.id}&data=${dataSelecionada}`}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    materiaId === m.id || (!materiaId && isProfessor && turma.materias[0]?.id === m.id)
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}
                >
                  {m.nome}
                </Link>
              ))}
            </div>
          )}

          {/* Seletor de data */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Data:</span>
            <form method="GET">
              {materiaId && <input type="hidden" name="materiaId" value={materiaId} />}
              <input
                type="date"
                name="data"
                defaultValue={dataSelecionada}
                max={hoje}
                onChange={(e) => e.currentTarget.form?.submit()}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500"
              />
            </form>
          </div>

          {/* Form de chamada */}
          {alunos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center">
              <p className="text-zinc-500">
                {isProfessor && turma.materias.length === 0
                  ? 'Você não está atribuído a nenhuma matéria desta turma.'
                  : 'Nenhum aluno matriculado para registrar chamada.'}
              </p>
            </div>
          ) : (
            <ChamadaForm
              alunos={alunos}
              turmaId={!materiaAtual ? turmaId : undefined}
              materiaId={materiaAtual?.id}
              data={dataSelecionada}
              existentes={existentesMap}
            />
          )}
        </div>

        {/* Painel direito: histórico de datas */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-700">Chamadas registradas</h3>
          {datasHistorico.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum registro ainda.</p>
          ) : (
            <div className="space-y-1">
              {datasHistorico.map((d) => (
                <Link
                  key={d}
                  href={`/turmas/${turmaId}/chamada?${materiaId ? `materiaId=${materiaId}&` : ''}data=${d}`}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    d === dataSelecionada
                      ? 'bg-zinc-900 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mini-grid de frequência por data (últimas 5 datas) */}
      {alunos.length > 0 && datasHistorico.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-zinc-700">Resumo recente</h3>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-400">Aluno</th>
                  {datasHistorico.slice(0, 5).map((d) => (
                    <th key={d} className="px-2 py-2 text-center text-xs font-medium text-zinc-400">
                      {new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {alunos.slice(0, 10).map((aluno) => (
                  <tr key={aluno.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 font-medium text-zinc-900">{aluno.nome}</td>
                    {datasHistorico.slice(0, 5).map((d) => {
                      const key = `${aluno.id}-${d}`
                      // Lookup from existentes (only for selected date) — simplified display
                      const status = d === dataSelecionada ? existentesMap[aluno.id] : undefined
                      const cfg = status ? statusLabels[status] : null
                      return (
                        <td key={key} className="px-2 py-2 text-center">
                          {cfg ? (
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${cfg.className}`}>
                              {cfg.label}
                            </span>
                          ) : (
                            <span className="text-zinc-200">·</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
