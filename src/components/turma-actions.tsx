'use client'

import { excluirTurma } from '@/lib/actions/turma'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function TurmaActions({ turmaId }: { turmaId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleExcluir() {
    if (!confirm('Excluir esta turma? Todas as matérias sem matrículas serão removidas.')) return
    const formData = new FormData()
    formData.set('id', turmaId)
    startTransition(async () => {
      const result = await excluirTurma(formData)
      if (result.ok) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/turmas/${turmaId}`}
        className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
      >
        Ver
      </Link>
      <Link
        href={`/turmas/${turmaId}/editar`}
        className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
      >
        Editar
      </Link>
      <button
        onClick={handleExcluir}
        disabled={isPending}
        className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Excluir
      </button>
    </div>
  )
}
