import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeGerirFinanceiro } from '@/lib/auth/permissions'
import { BoletoActions } from '@/components/boleto-actions'
import Link from 'next/link'
import type { StatusBoleto } from '@/generated/prisma/enums'

export const metadata = { title: 'Financeiro — Sistema Escolar' }

const statusConfig: Record<StatusBoleto, { label: string; className: string }> = {
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  PAGO: { label: 'Pago', className: 'bg-green-100 text-green-700' },
  VENCIDO: { label: 'Vencido', className: 'bg-red-100 text-red-600' },
  CANCELADO: { label: 'Cancelado', className: 'bg-zinc-100 text-zinc-400' },
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; mes?: string; alunoId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirFinanceiro(session.user.role)) redirect('/dashboard')

  const { status, mes, alunoId } = await searchParams

  // Filtro por mês: YYYY-MM → primeiro e último dia do mês
  let mesFilter: { gte: Date; lte: Date } | undefined
  if (mes) {
    const [ano, month] = mes.split('-').map(Number)
    mesFilter = {
      gte: new Date(Date.UTC(ano, month - 1, 1)),
      lte: new Date(Date.UTC(ano, month, 0, 23, 59, 59)),
    }
  }

  const boletos = await prisma.boleto.findMany({
    where: {
      ...(status ? { status: status as StatusBoleto } : {}),
      ...(mesFilter ? { mesReferencia: mesFilter } : {}),
      ...(alunoId ? { alunoId } : {}),
    },
    orderBy: [{ mesReferencia: 'desc' }, { aluno: { nome: 'asc' } }],
    select: {
      id: true,
      valor: true,
      mesReferencia: true,
      dataVencimento: true,
      dataPagamento: true,
      status: true,
      aluno: { select: { id: true, nome: true, numeroCadastro: true } },
      curso: { select: { nome: true } },
    },
  })

  const totalPendente = boletos
    .filter((b) => b.status === 'PENDENTE' || b.status === 'VENCIDO')
    .reduce((acc, b) => acc + Number(b.valor), 0)

  const totalPago = boletos
    .filter((b) => b.status === 'PAGO')
    .reduce((acc, b) => acc + Number(b.valor), 0)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Financeiro</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {boletos.length} boleto{boletos.length !== 1 ? 's' : ''}
            {totalPendente > 0 && (
              <span className="ml-2 text-amber-600">
                · R$ {totalPendente.toFixed(2)} a receber
              </span>
            )}
            {totalPago > 0 && (
              <span className="ml-2 text-green-600">
                · R$ {totalPago.toFixed(2)} recebido
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['', 'PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO'] as const).map((s) => (
          <Link
            key={s || 'all'}
            href={s ? `/financeiro?status=${s}${mes ? `&mes=${mes}` : ''}` : '/financeiro'}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              status === s || (!status && s === '')
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            {s === '' ? 'Todos' : statusConfig[s].label}
          </Link>
        ))}
        <form method="GET" className="flex items-center gap-1">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="month"
            name="mes"
            defaultValue={mes}
            onChange={(e) => e.currentTarget.form?.submit()}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs outline-none focus:border-zinc-500"
          />
        </form>
      </div>

      {boletos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum boleto encontrado.</p>
          <p className="mt-1 text-xs text-zinc-400">
            Teste local:{' '}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">
              curl -X POST http://localhost:3000/api/cron/boletos -H &quot;Authorization: Bearer change-me-before-production&quot;
            </code>
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Aluno</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Curso</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Referência</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Vencimento</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {boletos.map((b) => {
                const cfg = statusConfig[b.status]
                return (
                  <tr key={b.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <Link href={`/alunos/${b.aluno.id}`} className="font-medium text-zinc-900 hover:underline">
                        {b.aluno.nome}
                      </Link>
                      {b.aluno.numeroCadastro && (
                        <p className="font-mono text-xs text-zinc-400">{b.aluno.numeroCadastro}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{b.curso.nome}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {b.mesReferencia.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {b.dataVencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      R$ {Number(b.valor).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                      </span>
                      {b.dataPagamento && (
                        <p className="mt-0.5 text-xs text-zinc-400">
                          {b.dataPagamento.toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/financeiro/boletos/${b.id}`}
                          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
                        >
                          Detalhes
                        </Link>
                        <BoletoActions boletoId={b.id} status={b.status} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
