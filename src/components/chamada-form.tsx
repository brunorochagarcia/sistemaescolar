'use client'

import { salvarChamada } from '@/lib/actions/presenca'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { StatusPresenca } from '@/generated/prisma/enums'

interface Aluno {
  id: string
  nome: string
}

interface ChamadaFormProps {
  alunos: Aluno[]
  turmaId?: string
  materiaId?: string
  data: string // YYYY-MM-DD
  // presencas já registradas para este dia (para pré-preencher)
  existentes: Record<string, StatusPresenca>
}

const statusOpcoes: { value: StatusPresenca; label: string; className: string }[] = [
  { value: 'PRESENTE', label: 'Presente', className: 'bg-green-100 text-green-700 ring-green-300' },
  { value: 'ATRASADO', label: 'Atrasado', className: 'bg-amber-100 text-amber-700 ring-amber-300' },
  { value: 'AUSENTE', label: 'Ausente', className: 'bg-red-100 text-red-600 ring-red-300' },
]

export function ChamadaForm({ alunos, turmaId, materiaId, data, existentes }: ChamadaFormProps) {
  const router = useRouter()
  const [presencas, setPresencas] = useState<Record<string, StatusPresenca>>(() => {
    const inicial: Record<string, StatusPresenca> = {}
    for (const aluno of alunos) {
      inicial[aluno.id] = existentes[aluno.id] ?? 'PRESENTE'
    }
    return inicial
  })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function marcarTodos(status: StatusPresenca) {
    const todos: Record<string, StatusPresenca> = {}
    for (const aluno of alunos) {
      todos[aluno.id] = status
    }
    setPresencas(todos)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.set('data', data)
    if (turmaId) formData.set('turmaId', turmaId)
    if (materiaId) formData.set('materiaId', materiaId)
    formData.set(
      'presencas',
      JSON.stringify(
        Object.entries(presencas).map(([alunoId, status]) => ({ alunoId, status }))
      )
    )

    startTransition(async () => {
      const result = await salvarChamada(formData)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Ações rápidas */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-400">Marcar todos:</span>
        {statusOpcoes.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => marcarTodos(s.value)}
            className="rounded-full border border-zinc-200 px-3 py-0.5 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Lista de alunos */}
      <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {alunos.map((aluno) => (
          <div key={aluno.id} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium text-zinc-900">{aluno.nome}</span>
            <div className="flex gap-1">
              {statusOpcoes.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setPresencas((prev) => ({ ...prev, [aluno.id]: s.value }))}
                  className={`rounded-full px-3 py-0.5 text-xs font-medium transition-all ${
                    presencas[aluno.id] === s.value
                      ? `${s.className} ring-1`
                      : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || alunos.length === 0}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? 'Salvando...' : 'Salvar chamada'}
      </button>
    </form>
  )
}
