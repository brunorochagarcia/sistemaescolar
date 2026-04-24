'use client'

import { aprovarAluno } from '@/lib/actions/aluno'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface AlunoActionsProps {
  alunoId: string
  status: 'ATIVO' | 'PENDENTE' | 'INATIVO'
}

export function AlunoActions({ alunoId, status }: AlunoActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (status !== 'PENDENTE') return null

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

  return (
    <button
      onClick={handleAprovar}
      disabled={isPending}
      className="rounded-xl bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand/90 disabled:opacity-50"
    >
      {isPending ? 'Aprovando...' : 'Aprovar'}
    </button>
  )
}
