// Centralized permission predicates — all role checks go through here.
// Never use inline role === 'X' checks in actions or pages.
// For resource-scoped checks (IDOR), combine these with an ownership db lookup.

import type { Role } from '@/generated/prisma/enums'
export type { Role } from '@/generated/prisma/enums'

// Full system access
export const isDiretor = (role: Role) => role === 'DIRETOR'

// Academic management: courses, classes, subjects, enrollments, attendance
export const podeGerirAcademico = (role: Role) =>
  role === 'DIRETOR' || role === 'COORDENADOR'

// Financial management: billing, payments, reports
export const podeGerirFinanceiro = (role: Role) =>
  role === 'DIRETOR' || role === 'FINANCEIRA'

// Subject-level access: launch grades, take attendance (scoped to own subjects)
export const podeGerirMateria = (role: Role) =>
  role === 'DIRETOR' || role === 'COORDENADOR' || role === 'PROFESSOR'

// Enrollment: students can request their own; admins can approve/create
export const podeSolicitarMatricula = (role: Role) =>
  role === 'DIRETOR' || role === 'COORDENADOR' || role === 'ALUNO'

// Approve enrollments (can bypass pending workflow)
export const podeAprovarMatricula = (role: Role) =>
  role === 'DIRETOR' || role === 'COORDENADOR'

// Approve student registration
export const podeAprovarAluno = (role: Role) =>
  role === 'DIRETOR' || role === 'COORDENADOR'
