'use client'

import { criarCurso, editarCurso } from '@/lib/actions/curso'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface CursoFormProps {
  defaultValues?: {
    id: string
    nome: string
    descricao: string | null
    valorMensalidade: string | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

const inputCls = 'rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20'

export function CursoForm({ defaultValues, onSuccess, onCancel }: CursoFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = !!defaultValues

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const action = isEdit ? editarCurso : criarCurso
      const result = await action(formData)
      if (result.ok) {
        if (onSuccess) {
          router.refresh()
          onSuccess()
        } else {
          router.push('/cursos')
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
          placeholder="Engenharia de Software"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">
          Descrição <span className="font-normal text-zinc-400">(opcional)</span>
        </label>
        <textarea
          name="descricao"
          rows={3}
          defaultValue={defaultValues?.descricao ?? ''}
          className={inputCls}
          placeholder="Descrição do curso..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">
          Mensalidade (R$) <span className="font-normal text-zinc-400">(opcional)</span>
        </label>
        <input
          name="valorMensalidade"
          type="number"
          min="0"
          step="0.01"
          defaultValue={defaultValues?.valorMensalidade ?? ''}
          className={inputCls}
          placeholder="1500.00"
        />
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
          {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar curso'}
        </button>
      </div>
    </form>
  )
}
