'use client'

import dynamic from 'next/dynamic'

// dynamic com ssr:false só pode ficar em Client Components
const PdfBoletoInner = dynamic(
  () => import('./pdf-boleto').then((m) => m.PdfBoleto),
  {
    ssr: false,
    loading: () => (
      <span className="inline-flex items-center rounded-xl bg-brand-light px-4 py-2 text-sm text-brand/60">
        Carregando PDF...
      </span>
    ),
  }
)

interface BoletoData {
  id: string
  alunoNome: string
  numeroCadastro: string | null
  cursoNome: string
  valor: number
  mesReferencia: string
  dataVencimento: string
  status: string
  codigoBarras: string
  linhaDigitavel: string
}

export function PdfBoletoLoader({ boleto }: { boleto: BoletoData }) {
  return <PdfBoletoInner boleto={boleto} />
}
