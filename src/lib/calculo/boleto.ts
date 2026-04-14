/**
 * Valor proporcional do boleto: mensalidade / totalMaterias * qtdAprovadas.
 * Retorna 0 se não há matérias ou nenhuma aprovada — nesses casos o boleto não é gerado.
 */
export function calcularValorBoleto(
  valorMensalidade: number,
  totalMaterias: number,
  qtdAprovadas: number
): number {
  if (totalMaterias === 0 || qtdAprovadas === 0) return 0
  return (valorMensalidade / totalMaterias) * qtdAprovadas
}
