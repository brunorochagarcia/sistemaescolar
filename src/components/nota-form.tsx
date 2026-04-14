'use client'

import { lancarNota, editarNota, excluirNota } from '@/lib/actions/nota'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface NotaFormProps {
  matriculaId: string
  onSuccess?: () => void
}

export function NotaForm({ matriculaId, onSuccess }: NotaFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const result = await lancarNota(formData)
      if (result.ok) {
        ;(e.target as HTMLFormElement).reset()
        router.refresh()
        onSuccess?.()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <input type="hidden" name="matriculaId" value={matriculaId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">Nota (0–10)</label>
        <input
          name="valor"
          type="number"
          step="0.1"
          min="0"
          max="10"
          required
          placeholder="8.5"
          className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <label className="text-xs text-zinc-500">Descrição</label>
        <input
          name="descricao"
          type="text"
          required
          maxLength={200}
          placeholder="Prova 1"
          className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? '...' : 'Lançar'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  )
}

interface NotaRowProps {
  notaId: string
  valor: number
  descricao: string
  matriculaId: string
}

export function NotaRow({ notaId, valor, descricao, matriculaId }: NotaRowProps) {
  const router = useRouter()
  const [editando, setEditando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleExcluir() {
    if (!confirm('Excluir esta nota?')) return
    const formData = new FormData()
    formData.set('notaId', notaId)
    startTransition(async () => {
      const result = await excluirNota(formData)
      if (result.ok) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  function handleEditar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await editarNota(formData)
      if (result.ok) {
        setEditando(false)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  if (editando) {
    return (
      <form onSubmit={handleEditar} className="flex items-center gap-2 py-1">
        <input type="hidden" name="notaId" value={notaId} />
        <input type="hidden" name="matriculaId" value={matriculaId} />
        <input
          name="valor"
          type="number"
          step="0.1"
          min="0"
          max="10"
          defaultValue={valor}
          required
          className="w-16 rounded border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-500"
        />
        <input
          name="descricao"
          type="text"
          defaultValue={descricao}
          required
          maxLength={200}
          className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-500"
        />
        <button type="submit" disabled={isPending} className="text-xs font-medium text-green-600 hover:text-green-700">
          Salvar
        </button>
        <button type="button" onClick={() => setEditando(false)} className="text-xs text-zinc-400 hover:text-zinc-700">
          Cancelar
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </form>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-right font-medium text-zinc-900">{valor.toFixed(1)}</span>
      <span className="flex-1 text-zinc-500">{descricao}</span>
      <button onClick={() => setEditando(true)} className="text-xs text-zinc-400 hover:text-zinc-700">
        Editar
      </button>
      <button onClick={handleExcluir} disabled={isPending} className="text-xs text-red-400 hover:text-red-600">
        Excluir
      </button>
    </div>
  )
}
