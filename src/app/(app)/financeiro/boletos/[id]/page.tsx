import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirFinanceiro } from '@/lib/auth/permissions'
import { BoletoActions } from '@/components/boleto-actions'
import { PdfBoletoLoader } from '@/components/pdf-boleto-loader'
import Link from 'next/link'
import type { StatusBoleto } from '@/generated/prisma/enums'

export const metadata = { title: 'Boleto — Sistema Escolar' }

const statusConfig: Record<StatusBoleto, { label: string; className: string }> = {
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  PAGO: { label: 'Pago', className: 'bg-green-100 text-green-700' },
  VENCIDO: { label: 'Vencido', className: 'bg-red-100 text-red-600' },
  CANCELADO: { label: 'Cancelado', className: 'bg-zinc-100 text-zinc-400' },
}

export default async function BoletoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirFinanceiro(session.user.role)) redirect('/dashboard')

  const { id } = await params

  const boleto = await prisma.boleto.findUnique({
    where: { id },
    select: {
      id: true,
      valor: true,
      mesReferencia: true,
      dataVencimento: true,
      dataPagamento: true,
      status: true,
      codigoBarras: true,
      linhaDigitavel: true,
      createdAt: true,
      aluno: { select: { id: true, nome: true, numeroCadastro: true } },
      curso: { select: { id: true, nome: true } },
    },
  })
  if (!boleto) notFound()

  const cfg = statusConfig[boleto.status]

  const pdfData = {
    id: boleto.id,
    alunoNome: boleto.aluno.nome,
    numeroCadastro: boleto.aluno.numeroCadastro,
    cursoNome: boleto.curso.nome,
    valor: Number(boleto.valor),
    mesReferencia: boleto.mesReferencia.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    dataVencimento: boleto.dataVencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    status: cfg.label,
    codigoBarras: boleto.codigoBarras,
    linhaDigitavel: boleto.linhaDigitavel,
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2 text-sm text-zinc-500">
          <Link href="/financeiro" className="hover:text-zinc-900">Financeiro</Link>
          <span>/</span>
          <span>Boleto</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Boleto</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {/* Cabeçalho */}
        <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-4">
          <p className="text-lg font-semibold text-zinc-900">
            {boleto.mesReferencia.toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric',
              timeZone: 'UTC',
            })}
          </p>
          <p className="text-sm text-zinc-500">{boleto.curso.nome}</p>
        </div>

        {/* Dados */}
        <div className="divide-y divide-zinc-100 px-6">
          <dl className="grid grid-cols-2 gap-4 py-4">
            <div>
              <dt className="text-xs text-zinc-400">Aluno</dt>
              <dd className="mt-0.5 font-medium text-zinc-900">
                <Link href={`/alunos/${boleto.aluno.id}`} className="hover:underline">
                  {boleto.aluno.nome}
                </Link>
              </dd>
              {boleto.aluno.numeroCadastro && (
                <dd className="font-mono text-xs text-zinc-400">{boleto.aluno.numeroCadastro}</dd>
              )}
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Valor</dt>
              <dd className="mt-0.5 text-2xl font-bold text-zinc-900">
                R$ {Number(boleto.valor).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Vencimento</dt>
              <dd className="mt-0.5 font-medium text-zinc-700">
                {boleto.dataVencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </dd>
            </div>
            {boleto.dataPagamento && (
              <div>
                <dt className="text-xs text-zinc-400">Pago em</dt>
                <dd className="mt-0.5 font-medium text-green-700">
                  {boleto.dataPagamento.toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-zinc-400">Emitido em</dt>
              <dd className="mt-0.5 text-zinc-500">
                {boleto.createdAt.toLocaleDateString('pt-BR')}
              </dd>
            </div>
          </dl>

          {/* Código de barras */}
          <div className="py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Linha Digitável</p>
            <p className="rounded-lg bg-zinc-50 px-4 py-3 font-mono text-sm tracking-wide text-zinc-700">
              {boleto.linhaDigitavel}
            </p>
          </div>

          <div className="py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Código de Barras</p>
            <p className="rounded-lg bg-zinc-50 px-4 py-3 font-mono text-xs tracking-wider text-zinc-600 break-all">
              {boleto.codigoBarras}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-4">
          <PdfBoletoLoader boleto={pdfData} />
          <BoletoActions boletoId={boleto.id} status={boleto.status} />
        </div>
      </div>
    </div>
  )
}
