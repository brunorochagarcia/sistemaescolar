'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { podeAprovarAluno } from '@/lib/auth/permissions'
import bcrypt from 'bcryptjs'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  registrarAlunoSchema,
  aprovarAlunoSchema,
  excluirAlunoSchema,
  editarAlunoSchema,
  criarAlunoAdminSchema,
} from '@/lib/schemas/aluno'

type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

// ─── Registrar Aluno (public — no auth required) ────────────────────────────
// Creates an Aluno with status PENDENTE for staff to review
export async function registrarAluno(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  // Step 1: No auth needed — public registration endpoint
  // Step 2: No role check — public
  // Step 3: Zod validation
  const raw = {
    nome: formData.get('nome'),
    email: formData.get('email'),
    emailResponsavel: formData.get('emailResponsavel') ?? '',
    dataNascimento: formData.get('dataNascimento') ?? '',
  }

  const parsed = registrarAlunoSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Dados inválidos'
    return { ok: false, error: firstError }
  }

  const { nome, email, emailResponsavel, dataNascimento } = parsed.data

  // Step 4: No ownership check — creating new record
  // Step 5: Execute
  try {
    const aluno = await prisma.aluno.create({
      data: {
        nome,
        email,
        emailResponsavel: emailResponsavel ?? null,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        status: 'PENDENTE',
      },
      select: { id: true },
    })

    return { ok: true, data: { id: aluno.id } }
  } catch (err: unknown) {
    const error = err as { code?: string }
    if (error.code === 'P2002') {
      return { ok: false, error: 'Este e-mail já está cadastrado.' }
    }
    console.error('[registrarAluno]', err)
    return { ok: false, error: 'Erro interno. Tente novamente.' }
  }
}

// ─── Aprovar Aluno (DIRETOR / COORDENADOR only) ──────────────────────────────
// Sets status ATIVO and generates numeroCadastro inside a transaction
export async function aprovarAluno(
  formData: FormData
): Promise<ActionResult<{ numeroCadastro: string }>> {
  // Step 1: Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // Step 2: Role check
  if (!podeAprovarAluno(session.user.role)) {
    return { ok: false, error: 'Sem permissão para aprovar alunos.' }
  }

  // Step 3: Zod validation
  const parsed = aprovarAlunoSchema.safeParse({ alunoId: formData.get('alunoId') })
  if (!parsed.success) return { ok: false, error: 'ID do aluno inválido.' }

  const { alunoId } = parsed.data

  // Step 4: Ownership / existence check
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    select: { id: true, status: true },
  })
  if (!aluno) return { ok: false, error: 'Aluno não encontrado.' }
  if (aluno.status !== 'PENDENTE') {
    return { ok: false, error: 'Aluno já foi processado (não está PENDENTE).' }
  }

  // Step 5: Execute inside transaction to avoid race on numeroCadastro
  try {
    const year = new Date().getFullYear()

    const updated = await prisma.$transaction(async (tx) => {
      // Count existing approved students for this year to generate sequential number
      const count = await tx.aluno.count({
        where: {
          numeroCadastro: { startsWith: `CAD-${year}-` },
        },
      })
      const seq = String(count + 1).padStart(5, '0')
      const numeroCadastro = `CAD-${year}-${seq}`

      return tx.aluno.update({
        where: { id: alunoId },
        data: { status: 'ATIVO', numeroCadastro },
        select: { numeroCadastro: true },
      })
    })

    revalidateTag('dashboard', {})
    return { ok: true, data: { numeroCadastro: updated.numeroCadastro! } }
  } catch (err: unknown) {
    const error = err as { code?: string }
    if (error.code === 'P2002') {
      // Concurrent insert — numeroCadastro collision is extremely unlikely but handled
      return { ok: false, error: 'Conflito de número de cadastro. Tente novamente.' }
    }
    console.error('[aprovarAluno]', err)
    return { ok: false, error: 'Erro interno. Tente novamente.' }
  }
}

// ─── Excluir Aluno (soft delete — DIRETOR / COORDENADOR only) ───────────────
// Sets status INATIVO — preserves enrollment, grade, and attendance history
export async function excluirAluno(formData: FormData): Promise<ActionResult> {
  // Step 1: Auth
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }

  // Step 2: Role check
  if (!podeAprovarAluno(session.user.role)) {
    return { ok: false, error: 'Sem permissão para excluir alunos.' }
  }

  // Step 3: Zod validation
  const parsed = excluirAlunoSchema.safeParse({ alunoId: formData.get('alunoId') })
  if (!parsed.success) return { ok: false, error: 'ID do aluno inválido.' }

  const { alunoId } = parsed.data

  // Step 4: Existence check
  const aluno = await prisma.aluno.findUnique({
    where: { id: alunoId },
    select: { id: true, status: true },
  })
  if (!aluno) return { ok: false, error: 'Aluno não encontrado.' }
  if (aluno.status === 'INATIVO') {
    return { ok: false, error: 'Aluno já está inativo.' }
  }

  // Step 5: Execute — soft delete
  try {
    await prisma.aluno.update({
      where: { id: alunoId },
      data: { status: 'INATIVO' },
    })
    revalidateTag('dashboard', {})
    return { ok: true }
  } catch (err) {
    console.error('[excluirAluno]', err)
    return { ok: false, error: 'Erro interno. Tente novamente.' }
  }
}

// ─── Editar Aluno (DIRETOR / COORDENADOR only) ───────────────────────────────
export async function editarAluno(formData: FormData): Promise<ActionResult> {
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }
  if (!podeAprovarAluno(session.user.role)) return { ok: false, error: 'Sem permissão.' }

  const parsed = editarAlunoSchema.safeParse({
    alunoId:          formData.get('alunoId'),
    nome:             formData.get('nome'),
    email:            formData.get('email'),
    cpf:              formData.get('cpf') ?? '',
    emailResponsavel: formData.get('emailResponsavel') ?? '',
    nomeResponsavel:  formData.get('nomeResponsavel') ?? '',
    telefone:         formData.get('telefone') ?? '',
    rg:               formData.get('rg') ?? '',
    endereco:         formData.get('endereco') ?? '',
    dataNascimento:   formData.get('dataNascimento') ?? '',
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const { alunoId, nome, email, cpf, emailResponsavel, nomeResponsavel, telefone, rg, endereco, dataNascimento } = parsed.data

  const existe = await prisma.aluno.findUnique({ where: { id: alunoId }, select: { id: true } })
  if (!existe) return { ok: false, error: 'Aluno não encontrado.' }

  try {
    await prisma.aluno.update({
      where: { id: alunoId },
      data: {
        nome,
        email,
        cpf:              cpf              ?? null,
        emailResponsavel: emailResponsavel ?? null,
        nomeResponsavel:  nomeResponsavel  ?? null,
        telefone:         telefone         ?? null,
        rg:               rg               ?? null,
        endereco:         endereco         ?? null,
        dataNascimento:   dataNascimento ? new Date(dataNascimento) : null,
      },
    })
    revalidatePath('/cadastros/alunos')
    return { ok: true }
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e.code === 'P2002') return { ok: false, error: 'Este e-mail já está em uso.' }
    console.error('[editarAluno]', err)
    return { ok: false, error: 'Erro interno. Tente novamente.' }
  }
}

// ─── Criar Aluno direto como ATIVO (DIRETOR / COORDENADOR only) ──────────────
export async function criarAlunoAdmin(
  formData: FormData
): Promise<ActionResult<{ id: string; numeroCadastro: string }>> {
  const session = await auth()
  if (!session) return { ok: false, error: 'Não autenticado.' }
  if (!podeAprovarAluno(session.user.role)) return { ok: false, error: 'Sem permissão.' }

  const parsed = criarAlunoAdminSchema.safeParse({
    nome:             formData.get('nome'),
    email:            formData.get('email'),
    senha:            formData.get('senha'),
    cpf:              formData.get('cpf') ?? '',
    emailResponsavel: formData.get('emailResponsavel') ?? '',
    nomeResponsavel:  formData.get('nomeResponsavel') ?? '',
    telefone:         formData.get('telefone') ?? '',
    rg:               formData.get('rg') ?? '',
    endereco:         formData.get('endereco') ?? '',
    dataNascimento:   formData.get('dataNascimento') ?? '',
  })
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const { nome, email, senha, cpf, emailResponsavel, nomeResponsavel, telefone, rg, endereco, dataNascimento } = parsed.data
  const hashedPassword = await bcrypt.hash(senha, 10)

  try {
    const year = new Date().getFullYear()
    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.aluno.count({ where: { numeroCadastro: { startsWith: `CAD-${year}-` } } })
      const numeroCadastro = `CAD-${year}-${String(count + 1).padStart(5, '0')}`
      const aluno = await tx.aluno.create({
        data: {
          nome, email, hashedPassword, status: 'ATIVO', numeroCadastro,
          cpf:              cpf              ?? null,
          emailResponsavel: emailResponsavel ?? null,
          nomeResponsavel:  nomeResponsavel  ?? null,
          telefone:         telefone         ?? null,
          rg:               rg               ?? null,
          endereco:         endereco         ?? null,
          dataNascimento:   dataNascimento ? new Date(dataNascimento) : null,
        },
        select: { id: true, numeroCadastro: true },
      })
      return aluno
    })
    revalidatePath('/cadastros/alunos')
    return { ok: true, data: { id: result.id, numeroCadastro: result.numeroCadastro! } }
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e.code === 'P2002') return { ok: false, error: 'Este e-mail já está cadastrado.' }
    console.error('[criarAlunoAdmin]', err)
    return { ok: false, error: 'Erro interno. Tente novamente.' }
  }
}
