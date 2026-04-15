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
      dataNascimento: true,
      numeroCadastro: true,
      status: true,
      createdAt: true,
    },
  })

  const formatted = alunos.map((a) => ({
    id: a.id,
    nome: a.nome,
    email: a.email,
    emailResponsavel: a.emailResponsavel,
    dataNascimento: a.dataNascimento
      ? a.dataNascimento.toISOString().slice(0, 10)
      : null,
    numeroCadastro: a.numeroCadastro,
    status: a.status,
    createdAt: a.createdAt.toLocaleDateString('pt-BR'),
  }))

  return (
    <div className="mx-auto max-w-5xl">
      <AlunosTable alunos={formatted} />
    </div>
  )
}
