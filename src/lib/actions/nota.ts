'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { podeGerirMateria } from '@/lib/auth/permissions'
import { lancarNotaSchema, editarNotaSchema, excluirNotaSchema } from '@/lib/schemas/nota'
import { revalidatePath } from 'next/cache'

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ─── Lançar Nota (PROFESSOR da matéria | COORDENADOR | DIRETOR) ──────────────
export async function lancarNota(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirMateria(session.user.role)) {
    return { ok: false, error: 'Sem permissão para lançar notas.' }
  }

  // 3. Zod
  const parsed = lancarNotaSchema.safeParse({
    matriculaId: formData.get('matriculaId'),
    valor: formData.get('valor'),
    descricao: formData.get('descricao'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. Verificar matrícula APROVADA + IDOR para PROFESSOR
  const matricula = await prisma.matricula.findUnique({
    where: { id: parsed.data.matriculaId },
    select: {
      status: true,
      alunoId: true,
      materia: { select: { id: true, instrutorId: true, turmaId: true } },
    },
  })
  if (!matricula) return { ok: false, error: 'Matrícula não encontrada.' }
  if (matricula.status !== 'APROVADA') {
    return { ok: false, error: 'Só é possível lançar notas em matrículas APROVADAS.' }
  }
  if (session.user.role === 'PROFESSOR') {
    if (!matricula.materia.instrutorId) {
      return { ok: false, error: 'Matéria sem professor atribuído. Apenas coordenação pode lançar notas.' }
    }
    if (matricula.materia.instrutorId !== session.user.id) {
      return { ok: false, error: 'Sem permissão para lançar notas em matéria de outro professor.' }
    }
  }

  // 5. Execute
  const nota = await prisma.nota.create({
    data: {
      matriculaId: parsed.data.matriculaId,
      valor: parsed.data.valor,
      descricao: parsed.data.descricao,
    },
    select: { id: true },
  })

  revalidatePath(`/turmas/${matricula.materia.turmaId}/notas`)
  revalidatePath(`/alunos/${matricula.alunoId}/notas`)
  return { ok: true, data: { id: nota.id } }
}

// ─── Editar Nota (mesmo guard de lancarNota) ─────────────────────────────────
export async function editarNota(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirMateria(session.user.role)) {
    return { ok: false, error: 'Sem permissão para editar notas.' }
  }

  // 3. Zod
  const parsed = editarNotaSchema.safeParse({
    notaId: formData.get('notaId'),
    matriculaId: formData.get('matriculaId'),
    valor: formData.get('valor'),
    descricao: formData.get('descricao'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. IDOR para PROFESSOR
  const nota = await prisma.nota.findUnique({
    where: { id: parsed.data.notaId },
    select: {
      matricula: {
        select: {
          alunoId: true,
          materia: { select: { instrutorId: true, turmaId: true } },
        },
      },
    },
  })
  if (!nota) return { ok: false, error: 'Nota não encontrada.' }

  if (session.user.role === 'PROFESSOR') {
    const instrutorId = nota.matricula.materia.instrutorId
    if (!instrutorId || instrutorId !== session.user.id) {
      return { ok: false, error: 'Sem permissão para editar esta nota.' }
    }
  }

  // 5. Execute
  await prisma.nota.update({
    where: { id: parsed.data.notaId },
    data: { valor: parsed.data.valor, descricao: parsed.data.descricao },
  })

  revalidatePath(`/turmas/${nota.matricula.materia.turmaId}/notas`)
  revalidatePath(`/alunos/${nota.matricula.alunoId}/notas`)
  return { ok: true }
}

// ─── Excluir Nota (mesmo guard de lancarNota) ─────────────────────────────────
export async function excluirNota(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirMateria(session.user.role)) {
    return { ok: false, error: 'Sem permissão para excluir notas.' }
  }

  // 3. Zod
  const parsed = excluirNotaSchema.safeParse({ notaId: formData.get('notaId') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  // 4. IDOR para PROFESSOR
  const nota = await prisma.nota.findUnique({
    where: { id: parsed.data.notaId },
    select: {
      matricula: {
        select: {
          alunoId: true,
          materia: { select: { instrutorId: true, turmaId: true } },
        },
      },
    },
  })
  if (!nota) return { ok: false, error: 'Nota não encontrada.' }

  if (session.user.role === 'PROFESSOR') {
    const instrutorId = nota.matricula.materia.instrutorId
    if (!instrutorId || instrutorId !== session.user.id) {
      return { ok: false, error: 'Sem permissão para excluir esta nota.' }
    }
  }

  // 5. Execute
  await prisma.nota.delete({ where: { id: parsed.data.notaId } })

  revalidatePath(`/turmas/${nota.matricula.materia.turmaId}/notas`)
  revalidatePath(`/alunos/${nota.matricula.alunoId}/notas`)
  return { ok: true }
}
