import { describe, it, expect } from 'vitest'
import { calcularMediaMateria, calcularMediaTurma, calcularMediaCurso } from '../media'

describe('calcularMediaMateria', () => {
  it('retorna a média correta para duas notas', () => {
    expect(calcularMediaMateria([8, 6])).toBe(7.0)
  })

  it('retorna null quando não há notas', () => {
    expect(calcularMediaMateria([])).toBeNull()
  })

  it('retorna a própria nota quando há uma única nota', () => {
    expect(calcularMediaMateria([10])).toBe(10.0)
  })
})

describe('calcularMediaTurma', () => {
  it('soma todas as notas brutas e divide pelo total — NÃO média das médias', () => {
    // matéria A: [8, 6], matéria B: [10] → (8+6+10)/3 = 8.0, não (7+10)/2 = 8.5
    expect(calcularMediaTurma([[8, 6], [10]])).toBe(8.0)
  })

  it('retorna null quando não há nenhuma nota em nenhuma matéria', () => {
    expect(calcularMediaTurma([[], []])).toBeNull()
  })

  it('ignora matérias sem notas no cálculo', () => {
    // matéria A: [8, 6], matéria B: sem notas → (8+6)/2 = 7.0
    expect(calcularMediaTurma([[8, 6], []])).toBe(7.0)
  })
})

describe('calcularMediaCurso', () => {
  it('soma todas as notas brutas do curso — NÃO média das médias', () => {
    // turma 1: matéria A [8, 6], matéria B [10] → 24 notas, soma=24
    // turma 2: matéria C [5] → 1 nota, soma=5
    // total: (8+6+10+5)/4 = 7.25
    expect(calcularMediaCurso([[[8, 6], [10]], [[5]]])).toBe(7.25)
  })

  it('retorna null quando não há notas em nenhuma turma', () => {
    expect(calcularMediaCurso([[[], []], [[]]])).toBeNull()
  })
})
