import { describe, it, expect } from 'vitest'
import { calcularSituacao } from '../situacao'

describe('calcularSituacao', () => {
  it('retorna APROVADO quando média ≥ 7.0', () => {
    expect(calcularSituacao(7.0, false)).toBe('APROVADO')
    expect(calcularSituacao(10.0, false)).toBe('APROVADO')
    expect(calcularSituacao(7.0, true)).toBe('APROVADO')
  })

  it('retorna EM_ANDAMENTO quando média < 7.0 e matéria não está encerrada', () => {
    expect(calcularSituacao(6.9, false)).toBe('EM_ANDAMENTO')
    expect(calcularSituacao(0, false)).toBe('EM_ANDAMENTO')
  })

  it('retorna REPROVADO quando média < 7.0 e matéria está encerrada', () => {
    expect(calcularSituacao(6.9, true)).toBe('REPROVADO')
    expect(calcularSituacao(0, true)).toBe('REPROVADO')
  })

  it('retorna EM_ANDAMENTO quando não há média (null) independente do estado', () => {
    expect(calcularSituacao(null, false)).toBe('EM_ANDAMENTO')
    expect(calcularSituacao(null, true)).toBe('EM_ANDAMENTO')
  })
})
