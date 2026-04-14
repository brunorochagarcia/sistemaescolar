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
}

export function CursoForm({ defaultValues }: CursoFormProps) {
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
        router.push('/cursos')
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
          placeholder="Engenharia de Software"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="descricao" className="text-sm font-medium text-zinc-700">
          Descrição <span className="font-normal text-zinc-400">(opcional)</span>
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={3}
          defaultValue={defaultValues?.descricao ?? ''}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          placeholder="Descrição do curso..."
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="valorMensalidade" className="text-sm font-medium text-zinc-700">
          Mensalidade (R$) <span className="font-normal text-zinc-400">(opcional)</span>
        </label>
        <input
          id="valorMensalidade"
          name="valorMensalidade"
          type="number"
          min="0"
          step="0.01"
          defaultValue={defaultValues?.valorMensalidade ?? ''}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          placeholder="1500.00"
        />
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
          {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar curso'}
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
