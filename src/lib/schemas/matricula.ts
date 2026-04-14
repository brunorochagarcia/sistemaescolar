import { z } from 'zod'

export const solicitarMatriculaSchema = z.object({
  alunoId: z.string().min(1, 'Aluno obrigatório'),
  materiaId: z.string().min(1, 'Matéria obrigatória'),
})

export const solicitarMatriculaTurmaSchema = z.object({
  alunoId: z.string().min(1, 'Aluno obrigatório'),
  turmaId: z.string().min(1, 'Turma obrigatória'),
})

export const matriculaIdSchema = z.object({
  matriculaId: z.string().min(1),
})

export const criarMatriculaAprovadaSchema = z.object({
  alunoId: z.string().min(1, 'Aluno obrigatório'),
  materiaId: z.string().min(1, 'Matéria obrigatória'),
})

export type SolicitarMatriculaInput = z.infer<typeof solicitarMatriculaSchema>
export type SolicitarMatriculaTurmaInput = z.infer<typeof solicitarMatriculaTurmaSchema>
