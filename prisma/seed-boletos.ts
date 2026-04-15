/**
 * Script one-shot: gera boletos de fev e mar/2026 (PAGO) e cancela ~25% dos de abr.
 * Uso: npm run db:seed:boletos
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })

function codigo() {
  return Array.from({ length: 48 }, () => Math.floor(Math.random() * 10)).join('')
}

function linha() {
  const b = () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')
  return `${b()}.${b()} ${b()}.${b()} ${b()}.${b()} 1 ${b()}`
}

async function gerarMes(ano: number, mes: number): Promise<number> {
  const mesRef = new Date(Date.UTC(ano, mes - 1, 1))
  const venc   = new Date(Date.UTC(ano, mes - 1, 10))

  const matriculas = await prisma.matricula.findMany({
    where: { status: 'APROVADA', aluno: { status: 'ATIVO' } },
    select: {
      alunoId: true,
      materia: {
        select: {
          turmaId: true,
          turma: {
            select: {
              cursoId: true,
              curso: { select: { valorMensalidade: true } },
              _count: { select: { materias: true } },
            },
          },
        },
      },
    },
  })

  // (alunoId → cursoId → turmaId) → { total, aprovadas, mensalidade }
  const mapa = new Map<string, Map<string, Map<string, { total: number; aprovadas: number; mensalidade: number }>>>()

  for (const m of matriculas) {
    const { alunoId } = m
    const { turmaId, turma } = m.materia
    const { cursoId, curso } = turma
    if (!curso.valorMensalidade) continue

    if (!mapa.has(alunoId)) mapa.set(alunoId, new Map())
    const porCurso = mapa.get(alunoId)!
    if (!porCurso.has(cursoId)) porCurso.set(cursoId, new Map())
    const porTurma = porCurso.get(cursoId)!
    if (!porTurma.has(turmaId))
      porTurma.set(turmaId, { total: turma._count.materias, aprovadas: 0, mensalidade: Number(curso.valorMensalidade) })
    porTurma.get(turmaId)!.aprovadas++
  }

  let gerados = 0
  for (const [alunoId, porCurso] of mapa) {
    for (const [cursoId, porTurma] of porCurso) {
      let valor = 0
      for (const e of porTurma.values())
        valor += (e.mensalidade / e.total) * e.aprovadas
      if (valor === 0) continue

      await prisma.boleto.upsert({
        where: { alunoId_cursoId_mesReferencia: { alunoId, cursoId, mesReferencia: mesRef } },
        create: { alunoId, cursoId, valor, mesReferencia: mesRef, dataVencimento: venc, codigoBarras: codigo(), linhaDigitavel: linha() },
        update: { valor },
      })
      gerados++
    }
  }
  return gerados
}

async function main() {
  console.log('💰 Gerando histórico de boletos...')

  // ── Fevereiro: gerar + marcar PAGO ───────────────────────────────────────────
  const febGerados = await gerarMes(2026, 2)
  const { count: febPagos } = await prisma.boleto.updateMany({
    where: { mesReferencia: new Date('2026-02-01T00:00:00Z'), status: 'PENDENTE' },
    data: { status: 'PAGO', dataPagamento: new Date('2026-02-28T10:00:00Z') },
  })
  console.log(`  ✓ Fevereiro: ${febGerados} gerados, ${febPagos} marcados como PAGO`)

  // ── Março: gerar + marcar PAGO ────────────────────────────────────────────────
  const marGerados = await gerarMes(2026, 3)
  const { count: marPagos } = await prisma.boleto.updateMany({
    where: { mesReferencia: new Date('2026-03-01T00:00:00Z'), status: 'PENDENTE' },
    data: { status: 'PAGO', dataPagamento: new Date('2026-03-31T10:00:00Z') },
  })
  console.log(`  ✓ Março: ${marGerados} gerados, ${marPagos} marcados como PAGO`)

  // ── Abril: pegar os já existentes e cancelar ~25% ────────────────────────────
  const abrBoletos = await prisma.boleto.findMany({
    where: { mesReferencia: new Date('2026-04-01T00:00:00Z'), status: 'PENDENTE' },
    orderBy: { createdAt: 'asc' },
  })
  const qtdCancelar = Math.ceil(abrBoletos.length * 0.25)
  const idsCancelar = abrBoletos.slice(0, qtdCancelar).map((b) => b.id)
  const { count: abrCancelados } = await prisma.boleto.updateMany({
    where: { id: { in: idsCancelar } },
    data: { status: 'CANCELADO' },
  })
  console.log(`  ✓ Abril: ${abrCancelados} cancelados de ${abrBoletos.length} pendentes`)

  console.log('\n✅ Pronto!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
