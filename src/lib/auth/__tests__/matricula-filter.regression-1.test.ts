import { describe, it, expect } from 'vitest'
import { podeSolicitarMatricula, podeGerirMateria } from '../permissions'
import type { Role } from '../permissions'

// Regression: ISSUE-001 — ALUNO role sees all students' enrollments (IDOR)
// Found by /qa on 2026-04-15
// Report: .gstack/qa-reports/qa-report-localhost-2026-04-15.md
//
// Root cause: matriculas/page.tsx queried prisma.matricula.findMany() with no
// alunoId filter for ALUNO role — every logged-in student could see all other
// students' enrollment data. Fixed by adding:
//   ...(isAluno ? { alunoId: session.user.id } : {})

/**
 * Builds the role-based WHERE clause for the matriculas query.
 * Mirrors the logic in src/app/(app)/matriculas/page.tsx.
 */
function buildMatriculaWhereFilter(role: Role, userId: string) {
  const isProfessor = role === 'PROFESSOR'
  const isAluno = role === 'ALUNO'

  return {
    ...(isProfessor ? { materia: { instrutorId: userId } } : {}),
    ...(isAluno ? { alunoId: userId } : {}),
  }
}

describe('matriculas WHERE filter — access control', () => {
  const alunoId = 'aluno-cuid-123'
  const professorId = 'prof-cuid-456'

  it('ALUNO: filters by own alunoId — cannot see other students enrollments', () => {
    const filter = buildMatriculaWhereFilter('ALUNO', alunoId)
    expect(filter).toEqual({ alunoId })
    expect(filter).not.toHaveProperty('materia')
  })

  it('PROFESSOR: filters by own instrutorId — sees only their subject enrollments', () => {
    const filter = buildMatriculaWhereFilter('PROFESSOR', professorId)
    expect(filter).toEqual({ materia: { instrutorId: professorId } })
    expect(filter).not.toHaveProperty('alunoId')
  })

  it('DIRETOR: no role-based filter — sees all enrollments', () => {
    const filter = buildMatriculaWhereFilter('DIRETOR', 'dir-id')
    expect(filter).toEqual({})
  })

  it('COORDENADOR: no role-based filter — sees all enrollments', () => {
    const filter = buildMatriculaWhereFilter('COORDENADOR', 'coord-id')
    expect(filter).toEqual({})
  })

  it('ALUNO filter is distinct from PROFESSOR filter', () => {
    const alunoFilter = buildMatriculaWhereFilter('ALUNO', alunoId)
    const profFilter = buildMatriculaWhereFilter('PROFESSOR', professorId)
    expect(alunoFilter).not.toEqual(profFilter)
  })

  describe('permission gates — who can reach the matriculas page', () => {
    it('ALUNO can request matriculas (podeSolicitarMatricula)', () => {
      expect(podeSolicitarMatricula('ALUNO')).toBe(true)
    })

    it('ALUNO cannot manage materias (podeGerirMateria)', () => {
      expect(podeGerirMateria('ALUNO')).toBe(false)
    })

    it('DIRETOR and COORDENADOR can both solicit and manage', () => {
      expect(podeSolicitarMatricula('DIRETOR')).toBe(true)
      expect(podeSolicitarMatricula('COORDENADOR')).toBe(true)
      expect(podeGerirMateria('DIRETOR')).toBe(true)
      expect(podeGerirMateria('COORDENADOR')).toBe(true)
    })

    it('FINANCEIRA cannot access matriculas page at all', () => {
      expect(podeSolicitarMatricula('FINANCEIRA')).toBe(false)
      expect(podeGerirMateria('FINANCEIRA')).toBe(false)
    })
  })
})
