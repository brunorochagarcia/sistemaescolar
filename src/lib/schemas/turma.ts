import { z } from 'zod'

export const criarTurmaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  turno: z.enum(['MANHA', 'TARDE', 'NOITE'], { error: 'Turno inválido' }),
  anoLetivo: z.string().min(4, 'Ano letivo inválido').max(9),
  cursoId: z.string().min(1, 'Selecione um curso'),
})

export const editarTurmaSchema = criarTurmaSchema.extend({
  id: z.string().min(1),
})

export const excluirTurmaSchema = z.object({
  id: z.string().min(1),
})

export type CriarTurmaInput = z.infer<typeof criarTurmaSchema>
export type EditarTurmaInput = z.infer<typeof editarTurmaSchema>
