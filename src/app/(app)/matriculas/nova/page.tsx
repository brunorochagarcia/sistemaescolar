import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeSolicitarMatricula, podeAprovarMatricula } from '@/lib/auth/permissions'
import { MatriculaForm } from '@/components/matricula-form'

export const metadata = { title: 'Nova Matrícula — Sistema Escolar' }

export default async function NovaMatriculaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeSolicitarMatricula(session.user.role)) redirect('/dashboard')

  const [alunos, materias, turmas] = await Promise.all([
    prisma.aluno.findMany({
      where: { status: 'ATIVO' },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, numeroCadastro: true },
    }),
    prisma.materia.findMany({
      orderBy: { nome: 'asc' },
      select: {
        id: true,
        nome: true,
        turma: { select: { id: true, nome: true } },
      },
    }),
    prisma.turma.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
  ])

  const aprovacaoImediata = podeAprovarMatricula(session.user.role)

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Nova Matrícula</h1>
        {aprovacaoImediata && (
          <p className="mt-1 text-sm text-zinc-500">
            Como coordenador/diretor, você pode matricular o aluno diretamente como aprovado.
          </p>
        )}
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <MatriculaForm
          alunos={alunos}
          materias={materias}
          turmas={turmas}
          aprovacaoImediata={aprovacaoImediata}
        />
      </div>
    </div>
  )
}
