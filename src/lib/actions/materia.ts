'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { podeGerirAcademico } from '@/lib/auth/permissions'
import { criarMateriaSchema, editarMateriaSchema, excluirMateriaSchema } from '@/lib/schemas/materia'
import { revalidatePath } from 'next/cache'

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export async function criarMateria(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirAcademico(session.user.role)) {
    return { ok: false, error: 'Sem permissão para criar matérias.' }
  }

  // 3. Zod
  const parsed = criarMateriaSchema.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') ?? '',
    turmaId: formData.get('turmaId'),
    instrutorId: formData.get('instrutorId') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. Verificar turma existe; se instrutor informado, verificar que é PROFESSOR
  const turma = await prisma.turma.findUnique({ where: { id: parsed.data.turmaId }, select: { id: true } })
  if (!turma) return { ok: false, error: 'Turma não encontrada.' }

  if (parsed.data.instrutorId) {
    const instrutor = await prisma.user.findUnique({
      where: { id: parsed.data.instrutorId },
      select: { role: true },
    })
    if (!instrutor) return { ok: false, error: 'Instrutor não encontrado.' }
    if (instrutor.role !== 'PROFESSOR') {
      return { ok: false, error: 'Instrutor deve ter role PROFESSOR.' }
    }
  }

  // 5. Execute
  const materia = await prisma.materia.create({
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      turmaId: parsed.data.turmaId,
      instrutorId: parsed.data.instrutorId ?? null,
    },
    select: { id: true },
  })

  revalidatePath(`/turmas/${parsed.data.turmaId}`)
  return { ok: true, data: { id: materia.id } }
}

export async function editarMateria(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirAcademico(session.user.role)) {
    return { ok: false, error: 'Sem permissão para editar matérias.' }
  }

  // 3. Zod
  const parsed = editarMateriaSchema.safeParse({
    id: formData.get('id'),
    nome: formData.get('nome'),
    descricao: formData.get('descricao') ?? '',
    turmaId: formData.get('turmaId'),
    instrutorId: formData.get('instrutorId') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. Existence + instrutor role check
  const materia = await prisma.materia.findUnique({ where: { id: parsed.data.id }, select: { turmaId: true } })
  if (!materia) return { ok: false, error: 'Matéria não encontrada.' }

  if (parsed.data.instrutorId) {
    const instrutor = await prisma.user.findUnique({
      where: { id: parsed.data.instrutorId },
      select: { role: true },
    })
    if (!instrutor || instrutor.role !== 'PROFESSOR') {
      return { ok: false, error: 'Instrutor deve ter role PROFESSOR.' }
    }
  }

  // 5. Execute
  const { id, ...data } = parsed.data
  await prisma.materia.update({
    where: { id },
    data: {
      nome: data.nome,
      descricao: data.descricao ?? null,
      turmaId: data.turmaId,
      instrutorId: data.instrutorId ?? null,
    },
  })

  revalidatePath(`/turmas/${materia.turmaId}`)
  return { ok: true }
}

export async function excluirMateria(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirAcademico(session.user.role)) {
    return { ok: false, error: 'Sem permissão para excluir matérias.' }
  }

  // 3. Zod
  const parsed = excluirMateriaSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  // 4. Checar matrículas vinculadas
  const matriculasCount = await prisma.matricula.count({ where: { materiaId: parsed.data.id } })
  if (matriculasCount > 0) {
    return { ok: false, error: `Matéria tem ${matriculasCount} matrícula(s). Remova-as primeiro.` }
  }

  const materia = await prisma.materia.findUnique({ where: { id: parsed.data.id }, select: { turmaId: true } })
  if (!materia) return { ok: false, error: 'Matéria não encontrada.' }

  // 5. Execute
  await prisma.materia.delete({ where: { id: parsed.data.id } })

  revalidatePath(`/turmas/${materia.turmaId}`)
  return { ok: true }
}
