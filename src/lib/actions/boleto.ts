'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { podeGerirFinanceiro } from '@/lib/auth/permissions'
import { marcarPagoSchema, cancelarBoletoSchema, enviarEmailBoletoSchema } from '@/lib/schemas/boleto'
import { calcularValorBoleto } from '@/lib/calculo/boleto'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gerarCodigoSimulado(): string {
  return Array.from({ length: 48 }, () => Math.floor(Math.random() * 10)).join('')
}

function gerarLinhaDigitavelSimulada(): string {
  const bloco = () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('')
  return `${bloco()}.${bloco()} ${bloco()}.${bloco()} ${bloco()}.${bloco()} 1 ${bloco()}`
}

// ─── Gerar Boletos (chamado pelo cron handler) ────────────────────────────────
// Não é Server Action — é importado diretamente pelo route handler
export async function gerarBoletos(
  mesReferencia: Date
): Promise<{ gerados: number }> {
  const mesRef = new Date(
    Date.UTC(mesReferencia.getFullYear(), mesReferencia.getMonth(), 1)
  )
  const dataVencimento = new Date(
    Date.UTC(mesReferencia.getFullYear(), mesReferencia.getMonth(), 10)
  )

  // Buscar todas as matrículas APROVADAS de alunos ATIVOS com dados do curso
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

  // Agregar: (alunoId, cursoId) → Map<turmaId, { totalMaterias, aprovadas, valorMensalidade }>
  type TurmaEntry = { total: number; aprovadas: number; mensalidade: number }
  const mapa = new Map<string, Map<string, Map<string, TurmaEntry>>>()
  // chave: alunoId → cursoId → turmaId → TurmaEntry

  for (const m of matriculas) {
    const { alunoId } = m
    const { turmaId, turma } = m.materia
    const { cursoId, curso } = turma
    if (!curso.valorMensalidade) continue // curso sem mensalidade — ignorar

    if (!mapa.has(alunoId)) mapa.set(alunoId, new Map())
    const porCurso = mapa.get(alunoId)!

    if (!porCurso.has(cursoId)) porCurso.set(cursoId, new Map())
    const porTurma = porCurso.get(cursoId)!

    if (!porTurma.has(turmaId)) {
      porTurma.set(turmaId, {
        total: turma._count.materias,
        aprovadas: 0,
        mensalidade: Number(curso.valorMensalidade),
      })
    }
    porTurma.get(turmaId)!.aprovadas++
  }

  let gerados = 0

  for (const [alunoId, porCurso] of mapa) {
    for (const [cursoId, porTurma] of porCurso) {
      // Somar valor proporcional de cada turma
      let valorTotal = 0
      for (const entry of porTurma.values()) {
        valorTotal += calcularValorBoleto(entry.mensalidade, entry.total, entry.aprovadas)
      }

      if (valorTotal === 0) continue

      try {
        await prisma.boleto.upsert({
          where: { alunoId_cursoId_mesReferencia: { alunoId, cursoId, mesReferencia: mesRef } },
          create: {
            alunoId,
            cursoId,
            valor: valorTotal,
            mesReferencia: mesRef,
            dataVencimento,
            codigoBarras: gerarCodigoSimulado(),
            linhaDigitavel: gerarLinhaDigitavelSimulada(),
          },
          update: { valor: valorTotal },
        })
        gerados++
      } catch (err: unknown) {
        const e = err as { code?: string }
        // P2002 = race condition numa execução simultânea — tratar como sucesso
        if (e.code !== 'P2002') {
          console.error('[gerarBoletos] upsert error:', err)
        }
      }
    }
  }

  return { gerados }
}

// ─── Marcar Boleto como Pago (DIRETOR | FINANCEIRA) ─────────────────────────
export async function marcarPago(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }
  if (!podeGerirFinanceiro(session.user.role)) {
    return { ok: false, error: 'Sem permissão.' }
  }

  const parsed = marcarPagoSchema.safeParse({ boletoId: formData.get('boletoId') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  const boleto = await prisma.boleto.findUnique({
    where: { id: parsed.data.boletoId },
    select: { status: true },
  })
  if (!boleto) return { ok: false, error: 'Boleto não encontrado.' }
  if (boleto.status !== 'PENDENTE' && boleto.status !== 'VENCIDO') {
    return { ok: false, error: `Boleto está ${boleto.status} — não pode ser marcado como pago.` }
  }

  await prisma.boleto.update({
    where: { id: parsed.data.boletoId },
    data: { status: 'PAGO', dataPagamento: new Date() },
  })

  revalidatePath('/financeiro')
  return { ok: true }
}

// ─── Cancelar Boleto (DIRETOR | FINANCEIRA) ──────────────────────────────────
export async function cancelarBoleto(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }
  if (!podeGerirFinanceiro(session.user.role)) {
    return { ok: false, error: 'Sem permissão.' }
  }

  const parsed = cancelarBoletoSchema.safeParse({ boletoId: formData.get('boletoId') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  const boleto = await prisma.boleto.findUnique({
    where: { id: parsed.data.boletoId },
    select: { status: true },
  })
  if (!boleto) return { ok: false, error: 'Boleto não encontrado.' }
  if (boleto.status === 'PAGO') {
    return { ok: false, error: 'Boleto já foi pago — não pode ser cancelado.' }
  }

  await prisma.boleto.update({
    where: { id: parsed.data.boletoId },
    data: { status: 'CANCELADO' },
  })

  revalidatePath('/financeiro')
  return { ok: true }
}

// ─── Enviar E-mail de Boleto (DIRETOR | FINANCEIRA) ──────────────────────────
export async function enviarEmailBoleto(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }
  if (!podeGerirFinanceiro(session.user.role)) {
    return { ok: false, error: 'Sem permissão.' }
  }

  const parsed = enviarEmailBoletoSchema.safeParse({ boletoId: formData.get('boletoId') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  const boleto = await prisma.boleto.findUnique({
    where: { id: parsed.data.boletoId },
    select: {
      id: true,
      valor: true,
      mesReferencia: true,
      dataVencimento: true,
      status: true,
      aluno: { select: { nome: true, email: true, emailResponsavel: true } },
      curso: { select: { nome: true } },
    },
  })
  if (!boleto) return { ok: false, error: 'Boleto não encontrado.' }
  if (boleto.status === 'CANCELADO') {
    return { ok: false, error: 'Boleto cancelado — não enviar.' }
  }

  const destinatarios = [boleto.aluno.email, boleto.aluno.emailResponsavel].filter(
    Boolean
  ) as string[]
  if (destinatarios.length === 0) {
    return { ok: false, error: 'Aluno sem e-mail cadastrado.' }
  }

  const mesLabel = boleto.mesReferencia.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const linkBoleto = `${env.NEXT_PUBLIC_URL}/financeiro/boletos/${boleto.id}`

  const resend = new Resend(env.RESEND_API_KEY)
  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: destinatarios,
      subject: `[EscolaFull] Boleto ${mesLabel} — ${boleto.curso.nome}`,
      html: `
        <p>Olá, ${boleto.aluno.nome}!</p>
        <p>Seu boleto de <strong>${mesLabel}</strong> referente ao curso <strong>${boleto.curso.nome}</strong> está disponível.</p>
        <ul>
          <li>Valor: <strong>R$ ${Number(boleto.valor).toFixed(2)}</strong></li>
          <li>Vencimento: <strong>${boleto.dataVencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</strong></li>
        </ul>
        <p><a href="${linkBoleto}">Visualizar e imprimir boleto</a></p>
        <p>Atenciosamente,<br/>Equipe EscolaFull</p>
      `,
    })
  } catch (err) {
    console.error('[enviarEmailBoleto] Resend error:', err)
    return { ok: false, error: 'Falha ao enviar e-mail.' }
  }

  return { ok: true }
}
