'use client'

import { criarTurma, editarTurma } from '@/lib/actions/turma'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Curso {
  id: string
  nome: string
}

interface TurmaFormProps {
  cursos: Curso[]
  defaultValues?: {
    id: string
    nome: string
    turno: string
    anoLetivo: string
    cursoId: string
  }
}

const turnoLabels = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }

export function TurmaForm({ cursos, defaultValues }: TurmaFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = !!defaultValues

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const action = isEdit ? editarTurma : criarTurma
      const result = await action(formData)
      if (result.ok) {
        router.push('/turmas')
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isEdit && <input type="hidden" name="id" value={defaultValues.id} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="nome" className="text-sm font-medium text-zinc-700">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          defaultValue={defaultValues?.nome}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          placeholder="ES-2025-A"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="turno" className="text-sm font-medium text-zinc-700">
            Turno <span className="text-red-500">*</span>
          </label>
          <select
            id="turno"
            name="turno"
            required
            defaultValue={defaultValues?.turno ?? ''}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          >
            <option value="" disabled>Selecione...</option>
            {Object.entries(turnoLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="anoLetivo" className="text-sm font-medium text-zinc-700">
            Ano Letivo <span className="text-red-500">*</span>
          </label>
          <input
            id="anoLetivo"
            name="anoLetivo"
            type="text"
            required
            defaultValue={defaultValues?.anoLetivo}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            placeholder="2025"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cursoId" className="text-sm font-medium text-zinc-700">
          Curso <span className="text-red-500">*</span>
        </label>
        <select
          id="cursoId"
          name="cursoId"
          required
          defaultValue={defaultValues?.cursoId ?? ''}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        >
          <option value="" disabled>Selecione um curso...</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar turma'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
