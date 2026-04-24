import { z } from 'zod'

export const registrarAlunoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  email: z.email('E-mail inválido'),
  emailResponsavel: z
    .string()
    .transform((v) => (v.trim() === '' ? undefined : v))
    .pipe(z.email('E-mail do responsável inválido').optional()),
  dataNascimento: z
    .string()
    .transform((v) => (v.trim() === '' ? undefined : v))
    .pipe(z.iso.date().optional()),
})

export const aprovarAlunoSchema = z.object({
  alunoId: z.string().min(1),
})

export const excluirAlunoSchema = z.object({
  alunoId: z.string().min(1),
})

const strOpc = (v: string) => v.trim() === '' ? undefined : v

const camposAluno = {
  nome:             z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  email:            z.email('E-mail inválido'),
  emailResponsavel: z.string().transform(strOpc).pipe(z.email('E-mail do responsável inválido').optional()),
  nomeResponsavel:  z.string().transform(strOpc).pipe(z.string().max(120).optional()),
  cpf:              z.string().transform(strOpc).pipe(z.string().max(14, 'CPF muito longo').optional()),
  telefone:         z.string().transform(strOpc).pipe(z.string().max(20, 'Telefone muito longo').optional()),
  rg:               z.string().transform(strOpc).pipe(z.string().max(20, 'RG muito longo').optional()),
  endereco:         z.string().transform(strOpc).pipe(z.string().max(255, 'Endereço muito longo').optional()),
  dataNascimento:   z.string().transform(strOpc).pipe(z.iso.date().optional()),
}

export const editarAlunoSchema = z.object({
  alunoId: z.string().min(1),
  ...camposAluno,
})

export const criarAlunoAdminSchema = z.object({
  ...camposAluno,
  senha: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

export type RegistrarAlunoInput = z.infer<typeof registrarAlunoSchema>
export type AprovarAlunoInput   = z.infer<typeof aprovarAlunoSchema>
export type ExcluirAlunoInput   = z.infer<typeof excluirAlunoSchema>
export type EditarAlunoInput    = z.infer<typeof editarAlunoSchema>
export type CriarAlunoAdminInput = z.infer<typeof criarAlunoAdminSchema>
