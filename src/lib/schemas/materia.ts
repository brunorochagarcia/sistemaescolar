import { z } from 'zod'

export const criarMateriaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  descricao: z
    .string()
    .transform((v) => (v.trim() === '' ? undefined : v.trim()))
    .pipe(z.string().optional()),
  turmaId: z.string().min(1, 'Turma obrigatória'),
  instrutorId: z
    .string()
    .transform((v) => (v.trim() === '' ? undefined : v.trim()))
    .pipe(z.string().optional()),
})

export const editarMateriaSchema = criarMateriaSchema.extend({
  id: z.string().min(1),
})

export const excluirMateriaSchema = z.object({
  id: z.string().min(1),
})

export type CriarMateriaInput = z.infer<typeof criarMateriaSchema>
export type EditarMateriaInput = z.infer<typeof editarMateriaSchema>
