'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { podeGerirAcademico, isDiretor } from '@/lib/auth/permissions'
import { criarCursoSchema, editarCursoSchema, excluirCursoSchema } from '@/lib/schemas/curso'
import { revalidatePath } from 'next/cache'

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

export async function criarCurso(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirAcademico(session.user.role)) {
    return { ok: false, error: 'Sem permissão para criar cursos.' }
  }

  // 3. Zod
  const parsed = criarCursoSchema.safeParse({
    nome: formData.get('nome'),
    descricao: formData.get('descricao') ?? '',
    valorMensalidade: formData.get('valorMensalidade') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. Sem ownership check — criando novo registro
  // 5. Execute
  const curso = await prisma.curso.create({
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      valorMensalidade: parsed.data.valorMensalidade ?? null,
    },
    select: { id: true },
  })

  revalidatePath('/cursos')
  return { ok: true, data: { id: curso.id } }
}

export async function editarCurso(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role
  if (!podeGerirAcademico(session.user.role)) {
    return { ok: false, error: 'Sem permissão para editar cursos.' }
  }

  // 3. Zod
  const parsed = editarCursoSchema.safeParse({
    id: formData.get('id'),
    nome: formData.get('nome'),
    descricao: formData.get('descricao') ?? '',
    valorMensalidade: formData.get('valorMensalidade') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  // 4. Existence check
  const exists = await prisma.curso.findUnique({ where: { id: parsed.data.id }, select: { id: true } })
  if (!exists) return { ok: false, error: 'Curso não encontrado.' }

  // 5. Execute
  await prisma.curso.update({
    where: { id: parsed.data.id },
    data: {
      nome: parsed.data.nome,
      descricao: parsed.data.descricao ?? null,
      valorMensalidade: parsed.data.valorMensalidade ?? null,
    },
  })

  revalidatePath('/cursos')
  return { ok: true }
}

export async function excluirCurso(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // 2. Role — só DIRETOR pode excluir cursos
  if (!isDiretor(session.user.role)) {
    return { ok: false, error: 'Apenas o Diretor pode excluir cursos.' }
  }

  // 3. Zod
  const parsed = excluirCursoSchema.safeParse({ id: formData.get('id') })
  if (!parsed.success) return { ok: false, error: 'ID inválido.' }

  // 4. Checar turmas vinculadas
  const turmasCount = await prisma.turma.count({ where: { cursoId: parsed.data.id } })
  if (turmasCount > 0) {
    return { ok: false, error: `Curso tem ${turmasCount} turma(s) vinculada(s). Remova-as primeiro.` }
  }

  // 5. Execute
  await prisma.curso.delete({ where: { id: parsed.data.id } })

  revalidatePath('/cursos')
  return { ok: true }
}
