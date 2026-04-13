'use client'

import { aprovarAluno, excluirAluno } from '@/lib/actions/aluno'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface AlunoActionsProps {
  alunoId: string
  status: 'ATIVO' | 'PENDENTE' | 'INATIVO'
}

export function AlunoActions({ alunoId, status }: AlunoActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAprovar() {
    const formData = new FormData()
    formData.set('alunoId', alunoId)
    startTransition(async () => {
      const result = await aprovarAluno(formData)
      if (result.ok) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  function handleExcluir() {
    if (!confirm('Desativar este aluno? O histórico será preservado.')) return
    const formData = new FormData()
    formData.set('alunoId', alunoId)
    startTransition(async () => {
      const result = await excluirAluno(formData)
      if (result.ok) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'PENDENTE' && (
        <button
          onClick={handleAprovar}
          disabled={isPending}
          className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Aprovar
        </button>
      )}
      <button
        onClick={handleExcluir}
        disabled={isPending}
        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Desativar
      </button>
    </div>
  )
}
