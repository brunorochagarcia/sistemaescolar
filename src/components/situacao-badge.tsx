import type { Situacao } from '@/lib/calculo/situacao'

const config: Record<Situacao, { label: string; className: string }> = {
  APROVADO: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
  REPROVADO: { label: 'Reprovado', className: 'bg-red-100 text-red-600' },
  EM_ANDAMENTO: { label: 'Em andamento', className: 'bg-brand-light text-brand' },
}

export function SituacaoBadge({ situacao }: { situacao: Situacao }) {
  const { label, className } = config[situacao]
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
