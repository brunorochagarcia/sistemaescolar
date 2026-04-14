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
  AUSENTE: { label: 'Falta', className: 'bg-red-100 text-red-600' },
}

export default async function FrequenciaAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
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
      alertaEnviado: true,
      presencas: {
        orderBy: { data: 'desc' },
        select: {
          id: true,
          data: true,
          status: true,
          turma: { select: { id: true, nome: true } },
          materia: { select: { id: true, nome: true } },
        },
      },
    },
  })
  if (!aluno) notFound()

  // Calcular frequência geral: PRESENTE + ATRASADO = presente
  const total = aluno.presencas.length
  const presentes = aluno.presencas.filter(
    (p) => p.status === 'PRESENTE' || p.status === 'ATRASADO'
  ).length
  const percentualGeral = total > 0 ? (presentes / total) * 100 : 0

  // Frequência por turma/matéria
  const porEscopo = new Map<
    string,
    { label: string; total: number; presentes: number }
  >()

  for (const p of aluno.presencas) {
    const key = p.materia
      ? `materia-${p.materia.id}`
      : p.turma
        ? `turma-${p.turma.id}`
        : 'geral'
    const label = p.materia?.nome ?? p.turma?.nome ?? 'Geral'

    if (!porEscopo.has(key)) {
      porEscopo.set(key, { label, total: 0, presentes: 0 })
    }
    const entry = porEscopo.get(key)!
    entry.total++
    if (p.status === 'PRESENTE' || p.status === 'ATRASADO') entry.presentes++
  }

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
      {porEscopo.size > 0 && (
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
                {Array.from(porEscopo.values()).map((entry, i) => {
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

      {/* Histórico detalhado */}
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">Histórico</h3>
      {aluno.presencas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-12 text-center">
          <p className="text-zinc-500">Nenhum registro de presença.</p>
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
              {aluno.presencas.map((p) => {
                const cfg = statusConfig[p.status]
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-700">
                      {p.data.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {p.materia?.nome ?? p.turma?.nome ?? '—'}
                    </td>
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
