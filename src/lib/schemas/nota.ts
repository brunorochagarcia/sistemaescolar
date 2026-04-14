import { z } from 'zod'

export const lancarNotaSchema = z.object({
  matriculaId: z.string().min(1, 'Matrícula obrigatória'),
  valor: z.coerce
    .number()
    .min(0, 'Mínimo 0')
    .max(10, 'Máximo 10'),
  descricao: z.string().min(1, 'Descrição obrigatória').max(200),
})

export const editarNotaSchema = lancarNotaSchema.extend({
  notaId: z.string().min(1),
})

export const excluirNotaSchema = z.object({
  notaId: z.string().min(1),
})

export type LancarNotaInput = z.infer<typeof lancarNotaSchema>
export type EditarNotaInput = z.infer<typeof editarNotaSchema>
