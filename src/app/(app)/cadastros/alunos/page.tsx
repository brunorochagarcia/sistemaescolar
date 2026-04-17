import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeAprovarAluno } from '@/lib/auth/permissions'
import { AlunosTable } from '@/components/alunos-table'

export const metadata = { title: 'Alunos — Sistema Escolar' }

export default async function AlunosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  if (!podeAprovarAluno(session.user.role)) {
    redirect('/dashboard')
  }

  // Run 3 independent queries in parallel instead of one 5-level deep nested query.
  // The nested approach (Aluno → Matricula → Materia → Turma → Curso) forces Prisma
  // to fire 5 sequential SQL statements. With the Neon HTTP driver each is a separate
  // network round trip. Splitting into parallel flat queries cuts the critical path
  // from 5 serial round trips to 3 (Matricula → Materia → Turma is still sequential).
  const [alunos, cursosAll, matriculasAprovadas] = await Promise.all([
    prisma.aluno.findMany({
      where: { status: { not: 'INATIVO' } },
      orderBy: [{ status: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        email: true,
        emailResponsavel: true,
        nomeResponsavel: true,
        telefone: true,
        rg: true,
        endereco: true,
        dataNascimento: true,
        numeroCadastro: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.curso.findMany({ select: { id: true, nome: true } }),
    prisma.matricula.findMany({
      where: {
        status: 'APROVADA',
        aluno: { status: { not: 'INATIVO' } },
      },
      select: {
        alunoId: true,
        materia: { select: { turma: { select: { cursoId: true } } } },
      },
    }),
  ])

  const cursoMap = new Map(cursosAll.map((c) => [c.id, c.nome]))
  const alunoToCursos = new Map<string, Set<string>>()
  for (const m of matriculasAprovadas) {
    const nome = cursoMap.get(m.materia.turma.cursoId)
    if (!nome) continue
    if (!alunoToCursos.has(m.alunoId)) alunoToCursos.set(m.alunoId, new Set())
    alunoToCursos.get(m.alunoId)!.add(nome)
  }

  const formatted = alunos.map((a) => ({
    id: a.id,
    nome: a.nome,
    email: a.email,
    emailResponsavel: a.emailResponsavel,
    nomeResponsavel: a.nomeResponsavel,
    telefone: a.telefone,
    rg: a.rg,
    endereco: a.endereco,
    dataNascimento: a.dataNascimento ? a.dataNascimento.toISOString().slice(0, 10) : null,
    numeroCadastro: a.numeroCadastro,
    cursos: [...(alunoToCursos.get(a.id) ?? [])],
    status: a.status,
    createdAt: a.createdAt.toLocaleDateString('pt-BR'),
  }))

  return (
    <div className="mx-auto max-w-5xl">
      <AlunosTable alunos={formatted} />
    </div>
  )
}
