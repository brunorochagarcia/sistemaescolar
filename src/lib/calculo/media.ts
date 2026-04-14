/**
 * Cálculo de médias sempre usa notas brutas — NÃO média das médias.
 * Fórmula: sum(todas as notas do escopo) / count(todas as notas do escopo)
 */

export function calcularMediaMateria(notas: number[]): number | null {
  if (notas.length === 0) return null
  const soma = notas.reduce((acc, n) => acc + n, 0)
  return soma / notas.length
}

export function calcularMediaTurma(notasPorMateria: number[][]): number | null {
  const todasAsNotas = notasPorMateria.flat()
  return calcularMediaMateria(todasAsNotas)
}

export function calcularMediaCurso(notasPorTurma: number[][][]): number | null {
  const todasAsNotas = notasPorTurma.flat(2)
  return calcularMediaMateria(todasAsNotas)
}
