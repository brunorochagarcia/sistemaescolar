import { describe, it, expect } from 'vitest'
import { calcularValorBoleto } from '../boleto'

describe('calcularValorBoleto', () => {
  it('calcula valor proporcional: 3 de 5 matérias aprovadas, mensalidade R$1.000 → R$600', () => {
    expect(calcularValorBoleto(1000, 5, 3)).toBe(600)
  })

  it('retorna 0 quando nenhuma matéria aprovada', () => {
    expect(calcularValorBoleto(1000, 5, 0)).toBe(0)
  })

  it('retorna valorMensalidade completo quando todas aprovadas', () => {
    expect(calcularValorBoleto(1000, 5, 5)).toBe(1000)
  })

  it('retorna 0 quando totalMaterias é 0 (turma sem matérias)', () => {
    expect(calcularValorBoleto(1000, 0, 0)).toBe(0)
  })

  it('calcula corretamente com valores decimais', () => {
    // R$300 / 3 matérias * 1 aprovada = R$100
    expect(calcularValorBoleto(300, 3, 1)).toBe(100)
  })
})
