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

  const alunos = await prisma.aluno.findMany({
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
      matriculas: {
        where: { status: 'APROVADA' },
        select: { materia: { select: { turma: { select: { curso: { select: { nome: true } } } } } } },
      },
    },
  })

  const formatted = alunos.map((a) => {
    const cursos = [...new Set(
      a.matriculas.map((m) => m.materia.turma.curso.nome)
    )]
    return {
      id: a.id,
      nome: a.nome,
      email: a.email,
      emailResponsavel: a.emailResponsavel,
      nomeResponsavel: a.nomeResponsavel,
      telefone: a.telefone,
      rg: a.rg,
      endereco: a.endereco,
      dataNascimento: a.dataNascimento
        ? a.dataNascimento.toISOString().slice(0, 10)
        : null,
      numeroCadastro: a.numeroCadastro,
      cursos,
      status: a.status,
      createdAt: a.createdAt.toLocaleDateString('pt-BR'),
    }
  })

  return (
    <div className="mx-auto max-w-5xl">
      <AlunosTable alunos={formatted} />
    </div>
  )
}
