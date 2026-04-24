'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { excluirMateria } from '@/lib/actions/materia'
import { MateriaForm } from './materia-form'

export interface MateriaRow {
  id: string
  nome: string
  descricao: string | null
  instrutorId: string | null
  instrutorNome: string | null
  matriculasCount: number
}

export interface Professor {
  id: string
  name: string
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Modal: Excluir ────────────────────────────────────────────────────────────

function ExcluirModal({ materia, onClose }: { materia: MateriaRow; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleExcluir() {
    const fd = new FormData()
    fd.set('id', materia.id)
    startTransition(async () => {
      const res = await excluirMateria(fd)
      if (res.ok) { router.refresh(); onClose() }
      else setError(res.error)
    })
  }

  return (
    <Modal title="Excluir matéria" onClose={onClose}>
      <p className="mb-4 text-sm text-zinc-600">
        Tem certeza que deseja excluir a matéria{' '}
        <span className="font-semibold text-zinc-900">{materia.nome}</span>?
        {materia.matriculasCount > 0 && (
          <span className="mt-2 block rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Esta matéria tem {materia.matriculasCount} matrícula(s) e não pode ser excluída.
          </span>
        )}
      </p>
      {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl bg-brand-light px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light/80">
          Cancelar
        </button>
        <button
          onClick={handleExcluir}
          disabled={isPending || materia.matriculasCount > 0}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Modal>
  )
}

// ── Seção de matérias ─────────────────────────────────────────────────────────

type ModalState =
  | { type: 'criar' }
  | { type: 'editar'; materia: MateriaRow }
  | { type: 'excluir'; materia: MateriaRow }
  | null

interface MateriasSectionProps {
  turmaId: string
  materias: MateriaRow[]
  professores: Professor[]
}

export function MateriasSection({ turmaId, materias, professores }: MateriasSectionProps) {
  const [modal, setModal] = useState<ModalState>(null)

  return (
    <>
      {/* Cabeçalho da seção */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-zinc-700">Matérias</h2>
        <button
          onClick={() => setModal({ type: 'criar' })}
          className="rounded-xl bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand/90"
        >
          + Nova matéria
        </button>
      </div>

      {materias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhuma matéria cadastrada nesta turma.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Matéria</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Professor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Matrículas</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {materias.map((materia) => (
                <tr key={materia.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{materia.nome}</p>
                    {materia.descricao && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{materia.descricao}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {materia.instrutorNome ?? <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{materia.matriculasCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/turmas/${turmaId}/materias/${materia.id}`}
                        className="rounded-xl bg-brand-light px-3 py-1 text-xs font-medium text-brand hover:bg-brand-light/80"
                      >
                        Ver
                      </Link>
                      <button
                        onClick={() => setModal({ type: 'editar', materia })}
                        className="rounded-xl bg-brand-light px-3 py-1 text-xs font-medium text-brand hover:bg-brand-light/80"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setModal({ type: 'excluir', materia })}
                        className="rounded-xl border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modais */}
      {modal?.type === 'criar' && (
        <Modal title="Nova matéria" onClose={() => setModal(null)}>
          <MateriaForm
            turmaId={turmaId}
            professores={professores}
            onSuccess={() => setModal(null)}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === 'editar' && (
        <Modal title="Editar matéria" onClose={() => setModal(null)}>
          <MateriaForm
            turmaId={turmaId}
            professores={professores}
            defaultValues={{
              id: modal.materia.id,
              nome: modal.materia.nome,
              descricao: modal.materia.descricao,
              instrutorId: modal.materia.instrutorId,
            }}
            onSuccess={() => setModal(null)}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === 'excluir' && (
        <ExcluirModal materia={modal.materia} onClose={() => setModal(null)} />
      )}
    </>
  )
}
