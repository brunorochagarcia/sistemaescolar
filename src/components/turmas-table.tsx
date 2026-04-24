'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { excluirTurma } from '@/lib/actions/turma'
import { TurmaForm } from './turma-form'

export interface TurmaRow {
  id: string
  nome: string
  turno: 'MANHA' | 'TARDE' | 'NOITE'
  anoLetivo: string
  cursoId: string
  materiasCount: number
}

export interface CursoComTurmas {
  id: string
  nome: string
  turmas: TurmaRow[]
}

export interface CursoOption {
  id: string
  nome: string
}

const turnoLabels = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' } as const

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-5">
          <h2 className="text-base font-semibold text-brand">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Modal: Excluir ────────────────────────────────────────────────────────────

function ExcluirModal({ turma, onClose }: { turma: TurmaRow; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleExcluir() {
    const fd = new FormData()
    fd.set('id', turma.id)
    startTransition(async () => {
      const res = await excluirTurma(fd)
      if (res.ok) { router.refresh(); onClose() }
      else setError(res.error)
    })
  }

  return (
    <Modal title="Excluir turma" onClose={onClose}>
      <p className="mb-4 text-sm text-zinc-600">
        Tem certeza que deseja excluir a turma{' '}
        <span className="font-semibold text-zinc-900">{turma.nome}</span>?
        {' '}A operação falha se houver matérias com matrículas.
      </p>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl bg-brand-light px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light/80">
          Cancelar
        </button>
        <button
          onClick={handleExcluir}
          disabled={isPending}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  )
}

// ── Tabela principal ──────────────────────────────────────────────────────────

type ModalState =
  | { type: 'criar' }
  | { type: 'editar'; turma: TurmaRow }
  | { type: 'excluir'; turma: TurmaRow }
  | null

interface TurmasTableProps {
  grupos: CursoComTurmas[]
  cursos: CursoOption[]
  podeExcluir: boolean
  totalTurmas: number
}

export function TurmasTable({ grupos, cursos, podeExcluir, totalTurmas }: TurmasTableProps) {
  const [modal, setModal] = useState<ModalState>(null)

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Turmas</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {totalTurmas} turma(s) em {grupos.filter(g => g.turmas.length > 0).length} curso(s)
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'criar' })}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
        >
          + Nova turma
        </button>
      </div>

      {/* Tabela por curso */}
      {totalTurmas === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhuma turma cadastrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.filter((g) => g.turmas.length > 0).map((grupo) => (
            <section key={grupo.id}>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500">
                {grupo.nome}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500">Turma</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500">Turno</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500">Ano Letivo</th>
                      <th className="px-4 py-3 text-left font-medium text-zinc-500">Matérias</th>
                      <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {grupo.turmas.map((turma) => (
                      <tr key={turma.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium text-zinc-900">{turma.nome}</td>
                        <td className="px-4 py-3 text-zinc-500">{turnoLabels[turma.turno]}</td>
                        <td className="px-4 py-3 text-zinc-500">{turma.anoLetivo}</td>
                        <td className="px-4 py-3 text-zinc-500">{turma.materiasCount}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/turmas/${turma.id}`}
                              className="rounded-xl bg-brand-light px-3 py-1 text-xs font-medium text-brand hover:bg-brand-light/80"
                            >
                              Ver
                            </Link>
                            <button
                              onClick={() => setModal({ type: 'editar', turma })}
                              className="rounded-xl bg-brand-light px-3 py-1 text-xs font-medium text-brand hover:bg-brand-light/80"
                            >
                              Editar
                            </button>
                            {podeExcluir && (
                              <button
                                onClick={() => setModal({ type: 'excluir', turma })}
                                className="rounded-xl border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modais */}
      {modal?.type === 'criar' && (
        <Modal title="Nova turma" onClose={() => setModal(null)}>
          <TurmaForm cursos={cursos} onSuccess={() => setModal(null)} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'editar' && (
        <Modal title="Editar turma" onClose={() => setModal(null)}>
          <TurmaForm
            cursos={cursos}
            defaultValues={{
              id: modal.turma.id,
              nome: modal.turma.nome,
              turno: modal.turma.turno,
              anoLetivo: modal.turma.anoLetivo,
              cursoId: modal.turma.cursoId,
            }}
            onSuccess={() => setModal(null)}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === 'excluir' && (
        <ExcluirModal turma={modal.turma} onClose={() => setModal(null)} />
      )}
    </>
  )
}
