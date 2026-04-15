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
  onSuccess?: () => void
  onCancel?: () => void
}

const turnoLabels = { MANHA: 'Manhã', TARDE: 'Tarde', NOITE: 'Noite' }

const inputCls = 'rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20'

export function TurmaForm({ cursos, defaultValues, onSuccess, onCancel }: TurmaFormProps) {
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
        if (onSuccess) {
          router.refresh()
          onSuccess()
        } else {
          router.push('/turmas')
          router.refresh()
        }
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isEdit && <input type="hidden" name="id" value={defaultValues.id} />}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          name="nome"
          type="text"
          required
          defaultValue={defaultValues?.nome}
          className={inputCls}
          placeholder="ES-2025-A"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Turno <span className="text-red-500">*</span>
          </label>
          <select
            name="turno"
            required
            defaultValue={defaultValues?.turno ?? ''}
            className={inputCls}
          >
            <option value="" disabled>Selecione...</option>
            {Object.entries(turnoLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Ano Letivo <span className="text-red-500">*</span>
          </label>
          <input
            name="anoLetivo"
            type="text"
            required
            defaultValue={defaultValues?.anoLetivo}
            className={inputCls}
            placeholder="2025"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">
          Curso <span className="text-red-500">*</span>
        </label>
        <select
          name="cursoId"
          required
          defaultValue={defaultValues?.cursoId ?? ''}
          className={inputCls}
        >
          <option value="" disabled>Selecione um curso...</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onCancel ? onCancel() : router.back()}
          className="rounded-xl bg-brand-light px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light/80"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar turma'}
        </button>
      </div>
    </form>
  )
}
