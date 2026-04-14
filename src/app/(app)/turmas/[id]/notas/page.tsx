import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirMateria } from '@/lib/auth/permissions'
import { NotaForm, NotaRow } from '@/components/nota-form'
import { calcularMediaMateria } from '@/lib/calculo/media'
import Link from 'next/link'

export const metadata = { title: 'Notas — Sistema Escolar' }

export default async function NotasTurmaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirMateria(session.user.role)) redirect('/dashboard')

  const { id } = await params

  const turma = await prisma.turma.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      materias: {
        // PROFESSOR só vê suas próprias matérias
        where:
          session.user.role === 'PROFESSOR'
            ? { instrutorId: session.user.id }
            : undefined,
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          instrutorId: true,
          matriculas: {
            where: { status: 'APROVADA' },
            orderBy: { aluno: { nome: 'asc' } },
            select: {
              id: true,
              aluno: { select: { id: true, nome: true } },
              notas: {
                orderBy: { data: 'asc' },
                select: { id: true, valor: true, descricao: true, data: true },
              },
            },
          },
        },
      },
    },
  })
  if (!turma) notFound()

  const isProfessor = session.user.role === 'PROFESSOR'

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/turmas" className="hover:text-zinc-900">Turmas</Link>
          <span>/</span>
          <Link href={`/turmas/${id}`} className="hover:text-zinc-900">{turma.nome}</Link>
          <span>/</span>
          <span>Notas</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Notas — {turma.nome}</h1>
      </div>

      {turma.materias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">
            {isProfessor
              ? 'Você não está atribuído a nenhuma matéria desta turma.'
              : 'Nenhuma matéria cadastrada nesta turma.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {turma.materias.map((materia) => {
            const podeEditar =
              !isProfessor || materia.instrutorId === session.user.id

            return (
              <div key={materia.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                  <p className="font-semibold text-zinc-900">{materia.nome}</p>
                  <p className="text-xs text-zinc-400">
                    {materia.matriculas.length} aluno{materia.matriculas.length !== 1 ? 's' : ''} matriculado{materia.matriculas.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {materia.matriculas.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-zinc-400">Nenhum aluno aprovado nesta matéria.</p>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {materia.matriculas.map((matricula) => {
                      const valores = matricula.notas.map((n) => Number(n.valor))
                      const media = calcularMediaMateria(valores)

                      return (
                        <div key={matricula.id} className="px-5 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <Link
                              href={`/alunos/${matricula.aluno.id}/notas`}
                              className="font-medium text-zinc-900 hover:underline"
                            >
                              {matricula.aluno.nome}
                            </Link>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-zinc-400">
                                {matricula.notas.length} nota{matricula.notas.length !== 1 ? 's' : ''}
                              </span>
                              {media !== null && (
                                <span
                                  className={`font-semibold ${media >= 7 ? 'text-green-600' : 'text-red-500'}`}
                                >
                                  Média: {media.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Notas existentes */}
                          {matricula.notas.length > 0 && (
                            <div className="mb-3 space-y-1.5 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                              {matricula.notas.map((nota) => (
                                <NotaRow
                                  key={nota.id}
                                  notaId={nota.id}
                                  valor={Number(nota.valor)}
                                  descricao={nota.descricao}
                                  matriculaId={matricula.id}
                                />
                              ))}
                            </div>
                          )}

                          {/* Formulário de lançamento */}
                          {podeEditar && (
                            <NotaForm matriculaId={matricula.id} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
