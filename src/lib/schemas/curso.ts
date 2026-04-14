import { z } from 'zod'

export const criarCursoSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  descricao: z
    .string()
    .max(500)
    .transform((v) => (v.trim() === '' ? undefined : v.trim()))
    .pipe(z.string().optional()),
  valorMensalidade: z
    .string()
    .transform((v) => (v.trim() === '' ? undefined : Number(v)))
    .pipe(z.number().min(0, 'Valor não pode ser negativo').optional()),
})

export const editarCursoSchema = criarCursoSchema.extend({
  id: z.string().min(1),
})

export const excluirCursoSchema = z.object({
  id: z.string().min(1),
})

export type CriarCursoInput = z.infer<typeof criarCursoSchema>
export type EditarCursoInput = z.infer<typeof editarCursoSchema>
