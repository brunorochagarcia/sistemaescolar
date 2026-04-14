import { z } from 'zod'

export const presencaItemSchema = z.object({
  alunoId: z.string().min(1),
  status: z.enum(['PRESENTE', 'AUSENTE', 'ATRASADO']),
})

export const salvarChamadaSchema = z
  .object({
    data: z.string().min(1, 'Data obrigatória'),
    materiaId: z.string().optional(),
    turmaId: z.string().optional(),
    presencas: z.array(presencaItemSchema).min(1, 'Pelo menos um aluno'),
  })
  .refine((d) => d.materiaId || d.turmaId, {
    message: 'materiaId ou turmaId é obrigatório',
  })

export type PresencaItem = z.infer<typeof presencaItemSchema>
export type SalvarChamadaInput = z.infer<typeof salvarChamadaSchema>
