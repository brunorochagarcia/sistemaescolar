'use client'

import { notificarAluno } from '@/lib/actions/presenca'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface NotificarAlunoButtonProps {
  alunoId: string
  alertaJaEnviado: boolean
}

export function NotificarAlunoButton({ alunoId, alertaJaEnviado }: NotificarAlunoButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm('Enviar alerta de baixa frequência para o aluno e responsável?')) return
    const formData = new FormData()
    formData.set('alunoId', alunoId)
    startTransition(async () => {
      const result = await notificarAluno(formData)
      if (result.ok) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  if (alertaJaEnviado) {
    return (
      <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-400">
        Alerta já enviado
      </span>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
    >
      {isPending ? 'Enviando...' : 'Notificar aluno'}
    </button>
  )
}
