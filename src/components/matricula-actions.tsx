'use client'

import { aprovarMatricula, rejeitarMatricula } from '@/lib/actions/matricula'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface MatriculaActionsProps {
  matriculaId: string
  status: 'PENDENTE' | 'APROVADA' | 'REJEITADA'
  // podeAprovar: false quando a matéria não tem instrutor e o usuário é PROFESSOR
  podeAprovar: boolean
}

export function MatriculaActions({ matriculaId, status, podeAprovar }: MatriculaActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleAprovar() {
    const formData = new FormData()
    formData.set('matriculaId', matriculaId)
    startTransition(async () => {
      const result = await aprovarMatricula(formData)
      if (result.ok) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  function handleRejeitar() {
    if (!confirm('Rejeitar esta matrícula?')) return
    const formData = new FormData()
    formData.set('matriculaId', matriculaId)
    startTransition(async () => {
      const result = await rejeitarMatricula(formData)
      if (result.ok) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  if (status !== 'PENDENTE') return <span className="text-zinc-300">—</span>

  return (
    <div className="flex items-center gap-2">
      {podeAprovar && (
        <button
          onClick={handleAprovar}
          disabled={isPending}
          className="rounded-xl bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          Aprovar
        </button>
      )}
      <button
        onClick={handleRejeitar}
        disabled={isPending}
        className="rounded-xl border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Rejeitar
      </button>
    </div>
  )
}
