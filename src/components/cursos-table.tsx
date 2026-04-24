'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { excluirCurso } from '@/lib/actions/curso'
import { CursoForm } from './curso-form'

export interface CursoRow {
  id: string
  nome: string
  descricao: string | null
  valorMensalidade: number | null
  turmasCount: number
}

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

function ExcluirModal({ curso, onClose }: { curso: CursoRow; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleExcluir() {
    const fd = new FormData()
    fd.set('id', curso.id)
    startTransition(async () => {
      const res = await excluirCurso(fd)
      if (res.ok) { router.refresh(); onClose() }
      else setError(res.error)
    })
  }

  return (
    <Modal title="Excluir curso" onClose={onClose}>
      <p className="mb-4 text-sm text-zinc-600">
        Tem certeza que deseja excluir o curso{' '}
        <span className="font-semibold text-zinc-900">{curso.nome}</span>?
        {curso.turmasCount > 0 && (
          <span className="mt-2 block rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Este curso tem {curso.turmasCount} turma(s) vinculada(s) e não pode ser excluído.
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
          disabled={isPending || curso.turmasCount > 0}
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
  | { type: 'editar'; curso: CursoRow }
  | { type: 'excluir'; curso: CursoRow }
  | null

interface CursosTableProps {
  cursos: CursoRow[]
  podeExcluir: boolean
}

export function CursosTable({ cursos, podeExcluir }: CursosTableProps) {
  const [modal, setModal] = useState<ModalState>(null)

  const formatMensalidade = (v: number | null) =>
    v != null
      ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : '—'

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Cursos</h1>
          <p className="mt-1 text-sm text-zinc-500">{cursos.length} curso(s) cadastrado(s)</p>
        </div>
        <button
          onClick={() => setModal({ type: 'criar' })}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
        >
          + Novo curso
        </button>
      </div>

      {/* Tabela */}
      {cursos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum curso cadastrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Mensalidade</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Turmas</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {cursos.map((curso) => (
                <tr key={curso.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{curso.nome}</p>
                    {curso.descricao && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">{curso.descricao}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{formatMensalidade(curso.valorMensalidade)}</td>
                  <td className="px-4 py-3 text-zinc-500">{curso.turmasCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModal({ type: 'editar', curso })}
                        className="rounded-xl bg-brand-light px-3 py-1 text-xs font-medium text-brand hover:bg-brand-light/80"
                      >
                        Editar
                      </button>
                      {podeExcluir && (
                        <button
                          onClick={() => setModal({ type: 'excluir', curso })}
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
      )}

      {/* Modais */}
      {modal?.type === 'criar' && (
        <Modal title="Novo curso" onClose={() => setModal(null)}>
          <CursoForm onSuccess={() => setModal(null)} onCancel={() => setModal(null)} />
        </Modal>
      )}

      {modal?.type === 'editar' && (
        <Modal title="Editar curso" onClose={() => setModal(null)}>
          <CursoForm
            defaultValues={{
              id: modal.curso.id,
              nome: modal.curso.nome,
              descricao: modal.curso.descricao,
              valorMensalidade: modal.curso.valorMensalidade?.toString() ?? null,
            }}
            onSuccess={() => setModal(null)}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}

      {modal?.type === 'excluir' && (
        <ExcluirModal curso={modal.curso} onClose={() => setModal(null)} />
      )}
    </>
  )
}
