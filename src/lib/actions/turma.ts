'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { podeGerirAcademico, isDiretor } from '@/lib/auth/permissions'
import { criarTurmaSchema, editarTurmaSchema, excluirTurmaSchema } from '@/lib/schemas/turma'
import { revalidatePath } from 'next/cache'

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export async function criarTurma(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirAcademico(session.user.role)) {
    return { ok: false, error: 'Sem permissão para criar turmas.' }
  }

  // 3. Zod
  const parsed = criarTurmaSchema.safeParse({
    nome: formData.get('nome'),
    turno: formData.get('turno'),
    anoLetivo: formData.get('anoLetivo'),
    cursoId: formData.get('cursoId'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. Verificar curso existe
  const curso = await prisma.curso.findUnique({ where: { id: parsed.data.cursoId }, select: { id: true } })
  if (!curso) return { ok: false, error: 'Curso não encontrado.' }

  // 5. Execute
  const turma = await prisma.turma.create({
    data: parsed.data,
    select: { id: true },
  })

  revalidatePath('/turmas')
  return { ok: true, data: { id: turma.id } }
}

export async function editarTurma(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirAcademico(session.user.role)) {
    return { ok: false, error: 'Sem permissão para editar turmas.' }
  }

  // 3. Zod
  const parsed = editarTurmaSchema.safeParse({
    id: formData.get('id'),
    nome: formData.get('nome'),
    turno: formData.get('turno'),
    anoLetivo: formData.get('anoLetivo'),
    cursoId: formData.get('cursoId'),
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. Existence check
  const exists = await prisma.turma.findUnique({ where: { id: parsed.data.id }, select: { id: true } })
  if (!exists) return { ok: false, error: 'Turma não encontrada.' }

  // 5. Execute
  const { id, ...data } = parsed.data
  await prisma.turma.update({ where: { id }, data })

  revalidatePath('/turmas')
  revalidatePath(`/turmas/${id}`)
  return { ok: true }
}

export async function excluirTurma(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role — só DIRETOR pode excluir turmas
  if (!isDiretor(session.user.role)) {
    return { ok: false, error: 'Apenas o Diretor pode excluir turmas.' }
  }

  // 3. Zod
  const parsed = excluirTurmaSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  // 4. Checar matrículas vinculadas
  const matriculasCount = await prisma.matricula.count({
    where: { materia: { turmaId: parsed.data.id } },
  })
  if (matriculasCount > 0) {
    return { ok: false, error: `Turma tem ${matriculasCount} matrícula(s) vinculada(s). Remova-as primeiro.` }
  }

  // 5. Execute — cascade deleta matérias via relação
  await prisma.turma.delete({ where: { id: parsed.data.id } })

  revalidatePath('/turmas')
  return { ok: true }
}
