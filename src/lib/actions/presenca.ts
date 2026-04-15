'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { podeGerirMateria } from '@/lib/auth/permissions'
import { z } from 'zod'
import { salvarChamadaSchema } from '@/lib/schemas/presenca'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'

const notificarAlunoSchema = z.object({
  alunoId: z.string().min(1, 'ID do aluno obrigatório.'),
})

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ─── Salvar Chamada (PROFESSOR da matéria | COORDENADOR | DIRETOR) ────────────
export async function salvarChamada(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirMateria(session.user.role)) {
    return { ok: false, error: 'Sem permissão para registrar chamada.' }
  }

  // 3. Zod — presencas vem como JSON string
  let presencasRaw: unknown
  try {
    presencasRaw = JSON.parse(formData.get('presencas') as string)
  } catch {
    return { ok: false, error: 'Dados de presença inválidos.' }
  }

  const parsed = salvarChamadaSchema.safeParse({
    data: formData.get('data'),
    materiaId: formData.get('materiaId') || undefined,
    turmaId: formData.get('turmaId') || undefined,
    presencas: presencasRaw,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. IDOR: PROFESSOR só registra chamada nas suas próprias matérias
  if (session.user.role === 'PROFESSOR') {
    if (!parsed.data.materiaId) {
      return { ok: false, error: 'Professor precisa informar a matéria para registrar chamada.' }
    }
    const materia = await prisma.materia.findUnique({
      where: { id: parsed.data.materiaId },
      select: { instrutorId: true },
    })
    if (!materia) return { ok: false, error: 'Matéria não encontrada.' }
    if (materia.instrutorId !== session.user.id) {
      return { ok: false, error: 'Sem permissão para registrar chamada nesta matéria.' }
    }
  }

  // Validar que todos os alunos estão ATIVOS
  const alunoIds = parsed.data.presencas.map((p) => p.alunoId)
  const alunos = await prisma.aluno.findMany({
    where: { id: { in: alunoIds } },
    select: { id: true, status: true },
  })
  const inativo = alunos.find((a) => a.status !== 'ATIVO')
  if (inativo) {
    return { ok: false, error: `Aluno ${inativo.id} não está ATIVO.` }
  }

  // Normalizar data para meia-noite UTC
  const dataRef = new Date(`${parsed.data.data}T00:00:00.000Z`)

  // 5. Execute em transaction: delete existentes + create novos
  await prisma.$transaction(async (tx) => {
    await tx.presenca.deleteMany({
      where: {
        data: dataRef,
        alunoId: { in: alunoIds },
        ...(parsed.data.materiaId ? { materiaId: parsed.data.materiaId } : {}),
        ...(parsed.data.turmaId ? { turmaId: parsed.data.turmaId } : {}),
      },
    })

    await tx.presenca.createMany({
      data: parsed.data.presencas.map((p) => ({
        alunoId: p.alunoId,
        status: p.status,
        data: dataRef,
        materiaId: parsed.data.materiaId ?? null,
        turmaId: parsed.data.turmaId ?? null,
      })),
    })
  })

  if (parsed.data.turmaId) revalidatePath(`/turmas/${parsed.data.turmaId}/chamada`)
  if (parsed.data.materiaId) revalidatePath(`/turmas`)
  return { ok: true }
}

// ─── Notificar Aluno por baixa frequência (DIRETOR | COORDENADOR) ─────────────
export async function notificarAluno(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (session.user.role !== 'DIRETOR' && session.user.role !== 'COORDENADOR') {
    return { ok: false, error: 'Sem permissão para enviar notificações.' }
  }

  // 3. Zod
  const parsed = notificarAlunoSchema.safeParse({ alunoId: formData.get('alunoId') })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }
  const { alunoId } = parsed.data

  // 4. Buscar aluno
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    select: { id: true, nome: true, email: true, emailResponsavel: true, alertaEnviado: true },
  })
  if (!aluno) return { ok: false, error: 'Aluno não encontrado.' }

  // Sem duplicar alertas
  if (aluno.alertaEnviado) {
    return { ok: false, error: 'Alerta já foi enviado para este aluno.' }
  }

  const destinatarios = [aluno.email, aluno.emailResponsavel].filter(Boolean) as string[]
  if (destinatarios.length === 0) {
    return { ok: false, error: 'Aluno não possui e-mail cadastrado.' }
  }

  // 4. Enviar via Resend
  const resend = new Resend(env.RESEND_API_KEY)

  try {
    await resend.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to: destinatarios,
      subject: `[EscolaFull] Alerta de frequência — ${aluno.nome}`,
      html: `
        <p>Olá,</p>
        <p>Este é um alerta automático sobre a frequência do aluno <strong>${aluno.nome}</strong>.</p>
        <p>A frequência está abaixo do mínimo exigido (75%). Entre em contato com a escola para mais informações.</p>
        <p>Atenciosamente,<br/>Equipe EscolaFull</p>
      `,
    })
  } catch (err) {
    console.error('[notificarAluno] Resend error:', err)
    return { ok: false, error: 'Falha ao enviar e-mail. Tente novamente.' }
  }

  // 5. Marcar alerta como enviado
  await prisma.aluno.update({
    where: { id: alunoId },
    data: { alertaEnviado: true },
  })

  return { ok: true }
}

// ─── Notificar Todos com frequência < 75% (stretch goal) ─────────────────────
export async function notificarTodos(formData: FormData): Promise<ActionResult<{ enviados: number }>> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (session.user.role !== 'DIRETOR' && session.user.role !== 'COORDENADOR') {
    return { ok: false, error: 'Sem permissão.' }
  }

  // Buscar alunos ATIVO sem alerta enviado e com pelo menos uma presença
  const alunos = await prisma.aluno.findMany({
    where: { status: 'ATIVO', alertaEnviado: false },
    select: {
      id: true,
      nome: true,
      email: true,
      emailResponsavel: true,
      presencas: { select: { status: true } },
    },
  })

  const resend = new Resend(env.RESEND_API_KEY)
  const idsNotificados: string[] = []

  for (const aluno of alunos) {
    if (aluno.presencas.length === 0) continue

    const presentes = aluno.presencas.filter(
      (p) => p.status === 'PRESENTE' || p.status === 'ATRASADO'
    ).length
    const percentual = (presentes / aluno.presencas.length) * 100
    if (percentual >= 75) continue

    const destinatarios = [aluno.email, aluno.emailResponsavel].filter(Boolean) as string[]
    if (destinatarios.length === 0) continue

    try {
      await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to: destinatarios,
        subject: `[EscolaFull] Alerta de frequência — ${aluno.nome}`,
        html: `
          <p>Olá,</p>
          <p>A frequência do aluno <strong>${aluno.nome}</strong> está em <strong>${percentual.toFixed(0)}%</strong>, abaixo do mínimo exigido (75%).</p>
          <p>Entre em contato com a escola.</p>
          <p>Atenciosamente,<br/>Equipe EscolaFull</p>
        `,
      })
      idsNotificados.push(aluno.id)
    } catch (err) {
      console.error(`[notificarTodos] falha para aluno ${aluno.id}:`, err)
    }
  }

  // Marcar todos como notificados em um único roundtrip
  if (idsNotificados.length > 0) {
    await prisma.aluno.updateMany({
      where: { id: { in: idsNotificados } },
      data: { alertaEnviado: true },
    })
  }

  return { ok: true, data: { enviados: idsNotificados.length } }
}
