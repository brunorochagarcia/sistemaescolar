'use client'

import { marcarPago, cancelarBoleto, enviarEmailBoleto } from '@/lib/actions/boleto'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { StatusBoleto } from '@/generated/prisma/enums'

interface BoletoActionsProps {
  boletoId: string
  status: StatusBoleto
}

export function BoletoActions({ boletoId, status }: BoletoActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function run(action: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, confirm?: string) {
    if (confirm && !window.confirm(confirm)) return
    const fd = new FormData()
    fd.set('boletoId', boletoId)
    startTransition(async () => {
      const result = await action(fd)
      if (result.ok) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => run(enviarEmailBoleto)}
        disabled={isPending || status === 'CANCELADO'}
        className="rounded-xl bg-brand-light px-3 py-1 text-xs font-medium text-brand hover:bg-brand-light/80 disabled:opacity-40"
      >
        Enviar e-mail
      </button>
      {(status === 'PENDENTE' || status === 'VENCIDO') && (
        <button
          onClick={() => run(marcarPago)}
          disabled={isPending}
          className="rounded-xl bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-brand/90 disabled:opacity-50"
        >
          Marcar pago
        </button>
      )}
      {status !== 'PAGO' && status !== 'CANCELADO' && (
        <button
          onClick={() => run(cancelarBoleto, 'Cancelar este boleto?')}
          disabled={isPending}
          className="rounded-xl border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          Cancelar
        </button>
      )}
    </div>
  )
}
