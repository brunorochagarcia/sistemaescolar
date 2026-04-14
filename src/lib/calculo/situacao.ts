export type Situacao = 'APROVADO' | 'REPROVADO' | 'EM_ANDAMENTO'

/**
 * Determina a situação do aluno em uma matéria.
 * - Sem média → EM_ANDAMENTO (não há notas ainda)
 * - Média ≥ 7.0 → APROVADO
 * - Média < 7.0 e matéria encerrada → REPROVADO
 * - Média < 7.0 e matéria em andamento → EM_ANDAMENTO
 */
export function calcularSituacao(media: number | null, encerrada: boolean): Situacao {
  if (media === null) return 'EM_ANDAMENTO'
  if (media >= 7.0) return 'APROVADO'
  return encerrada ? 'REPROVADO' : 'EM_ANDAMENTO'
}
