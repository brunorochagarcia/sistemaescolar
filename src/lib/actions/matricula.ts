'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  podeGerirMateria,
  podeSolicitarMatricula,
  podeAprovarMatricula,
} from '@/lib/auth/permissions'
import {
  solicitarMatriculaSchema,
  solicitarMatriculaTurmaSchema,
  matriculaIdSchema,
  criarMatriculaAprovadaSchema,
} from '@/lib/schemas/matricula'
import { revalidatePath } from 'next/cache'

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ─── Solicitar Matrícula em Matéria (ALUNO | COORDENADOR | DIRETOR) ──────────
export async function solicitarMatricula(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeSolicitarMatricula(session.user.role)) {
    return { ok: false, error: 'Sem permissão para solicitar matrícula.' }
  }

  // 3. Zod
  const parsed = solicitarMatriculaSchema.safeParse({
    alunoId: formData.get('alunoId'),
    materiaId: formData.get('materiaId'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. IDOR: ALUNO só pode solicitar para si mesmo (verifica por e-mail)
  const aluno = await prisma.aluno.findUnique({
    where: { id: parsed.data.alunoId },
    select: { id: true, status: true, email: true },
  })
  if (!aluno) return { ok: false, error: 'Aluno não encontrado.' }
  if (aluno.status !== 'ATIVO') {
    return { ok: false, error: 'Aluno precisa estar ATIVO para se matricular.' }
  }
  if (session.user.role === 'ALUNO' && aluno.email !== session.user.email) {
    return { ok: false, error: 'Sem permissão para matricular outro aluno.' }
  }

  const materia = await prisma.materia.findUnique({
    where: { id: parsed.data.materiaId },
    select: { id: true },
  })
  if (!materia) return { ok: false, error: 'Matéria não encontrada.' }

  // 5. Execute
  try {
    const matricula = await prisma.matricula.create({
      data: {
        alunoId: parsed.data.alunoId,
        materiaId: parsed.data.materiaId,
        status: 'PENDENTE',
      },
      select: { id: true },
    })
    revalidatePath('/matriculas')
    return { ok: true, data: { id: matricula.id } }
  } catch (err: unknown) {
    const error = err as { code?: string }
    if (error.code === 'P2002') {
      return { ok: false, error: 'Aluno já matriculado nesta matéria.' }
    }
    console.error('[solicitarMatricula]', err)
    return { ok: false, error: 'Erro interno. Tente novamente.' }
  }
}

// ─── Solicitar Matrícula em Turma inteira (bulk, idempotente) ────────────────
export async function solicitarMatriculaTurma(
  formData: FormData
): Promise<ActionResult<{ count: number }>> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeSolicitarMatricula(session.user.role)) {
    return { ok: false, error: 'Sem permissão para solicitar matrícula.' }
  }

  // 3. Zod
  const parsed = solicitarMatriculaTurmaSchema.safeParse({
    alunoId: formData.get('alunoId'),
    turmaId: formData.get('turmaId'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. IDOR + status check
  const aluno = await prisma.aluno.findUnique({
    where: { id: parsed.data.alunoId },
    select: { id: true, status: true, email: true },
  })
  if (!aluno) return { ok: false, error: 'Aluno não encontrado.' }
  if (aluno.status !== 'ATIVO') {
    return { ok: false, error: 'Aluno precisa estar ATIVO para se matricular.' }
  }
  if (session.user.role === 'ALUNO' && aluno.email !== session.user.email) {
    return { ok: false, error: 'Sem permissão para matricular outro aluno.' }
  }

  const turma = await prisma.turma.findUnique({
    where: { id: parsed.data.turmaId },
    select: { materias: { select: { id: true } } },
  })
  if (!turma) return { ok: false, error: 'Turma não encontrada.' }
  if (turma.materias.length === 0) {
    return { ok: false, error: 'Esta turma não tem matérias cadastradas.' }
  }

  // 5. Execute — skipDuplicates garante idempotência
  const result = await prisma.matricula.createMany({
    data: turma.materias.map((m) => ({
      alunoId: parsed.data.alunoId,
      materiaId: m.id,
      status: 'PENDENTE' as const,
    })),
    skipDuplicates: true,
  })

  revalidatePath('/matriculas')
  return { ok: true, data: { count: result.count } }
}

// ─── Aprovar Matrícula (PROFESSOR da matéria | COORDENADOR | DIRETOR) ────────
export async function aprovarMatricula(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirMateria(session.user.role)) {
    return { ok: false, error: 'Sem permissão para aprovar matrículas.' }
  }

  // 3. Zod
  const parsed = matriculaIdSchema.safeParse({ matriculaId: formData.get('matriculaId') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  // 4. IDOR: PROFESSOR só aprova suas próprias matérias
  const matricula = await prisma.matricula.findUnique({
    where: { id: parsed.data.matriculaId },
    select: { status: true, materia: { select: { instrutorId: true } } },
  })
  if (!matricula) return { ok: false, error: 'Matrícula não encontrada.' }
  if (matricula.status !== 'PENDENTE') {
    return { ok: false, error: 'Matrícula não está PENDENTE.' }
  }
  if (session.user.role === 'PROFESSOR') {
    if (!matricula.materia.instrutorId) {
      return { ok: false, error: 'Matéria sem professor atribuído. Apenas coordenação pode aprovar.' }
    }
    if (matricula.materia.instrutorId !== session.user.id) {
      return { ok: false, error: 'Sem permissão para aprovar matrícula de outra matéria.' }
    }
  }

  // 5. Execute
  await prisma.matricula.update({
    where: { id: parsed.data.matriculaId },
    data: { status: 'APROVADA' },
  })

  revalidatePath('/matriculas')
  revalidatePath('/minhas-materias')
  return { ok: true }
}

// ─── Rejeitar Matrícula (mesmas regras de aprovarMatricula) ──────────────────
export async function rejeitarMatricula(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirMateria(session.user.role)) {
    return { ok: false, error: 'Sem permissão para rejeitar matrículas.' }
  }

  // 3. Zod
  const parsed = matriculaIdSchema.safeParse({ matriculaId: formData.get('matriculaId') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  // 4. IDOR: PROFESSOR só rejeita suas próprias matérias
  const matricula = await prisma.matricula.findUnique({
    where: { id: parsed.data.matriculaId },
    select: { status: true, materia: { select: { instrutorId: true } } },
  })
  if (!matricula) return { ok: false, error: 'Matrícula não encontrada.' }
  if (matricula.status !== 'PENDENTE') {
    return { ok: false, error: 'Matrícula não está PENDENTE.' }
  }
  if (session.user.role === 'PROFESSOR') {
    if (!matricula.materia.instrutorId) {
      return { ok: false, error: 'Matéria sem professor atribuído. Apenas coordenação pode rejeitar.' }
    }
    if (matricula.materia.instrutorId !== session.user.id) {
      return { ok: false, error: 'Sem permissão para rejeitar matrícula de outra matéria.' }
    }
  }

  // 5. Execute
  await prisma.matricula.update({
    where: { id: parsed.data.matriculaId },
    data: { status: 'REJEITADA' },
  })

  revalidatePath('/matriculas')
  revalidatePath('/minhas-materias')
  return { ok: true }
}

// ─── Criar Matrícula já Aprovada (bypass — COORDENADOR | DIRETOR) ─────────────
export async function criarMatriculaAprovada(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role — bypass exclusivo para coordenação/direção
  if (!podeAprovarMatricula(session.user.role)) {
    return { ok: false, error: 'Sem permissão para criar matrícula aprovada diretamente.' }
  }

  // 3. Zod
  const parsed = criarMatriculaAprovadaSchema.safeParse({
    alunoId: formData.get('alunoId'),
    materiaId: formData.get('materiaId'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. Verificar aluno ATIVO + matéria existe
  const aluno = await prisma.aluno.findUnique({
    where: { id: parsed.data.alunoId },
    select: { status: true },
  })
  if (!aluno) return { ok: false, error: 'Aluno não encontrado.' }
  if (aluno.status !== 'ATIVO') {
    return { ok: false, error: 'Aluno precisa estar ATIVO.' }
  }

  const materia = await prisma.materia.findUnique({
    where: { id: parsed.data.materiaId },
    select: { id: true },
  })
  if (!materia) return { ok: false, error: 'Matéria não encontrada.' }

  // 5. Execute
  try {
    const matricula = await prisma.matricula.create({
      data: {
        alunoId: parsed.data.alunoId,
        materiaId: parsed.data.materiaId,
        status: 'APROVADA',
      },
      select: { id: true },
    })
    revalidatePath('/matriculas')
    return { ok: true, data: { id: matricula.id } }
  } catch (err: unknown) {
    const error = err as { code?: string }
    if (error.code === 'P2002') {
      return { ok: false, error: 'Aluno já matriculado nesta matéria.' }
    }
    console.error('[criarMatriculaAprovada]', err)
    return { ok: false, error: 'Erro interno. Tente novamente.' }
  }
}
