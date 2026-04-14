import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { podeGerirAcademico } from '@/lib/auth/permissions'
import { CursoForm } from '@/components/curso-form'

export const metadata = { title: 'Editar Curso — Sistema Escolar' }

export default async function EditarCursoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirAcademico(session.user.role)) redirect('/dashboard')

  const { id } = await params

  const curso = await prisma.curso.findUnique({
    where: { id },
    select: { id: true, nome: true, descricao: true, valorMensalidade: true },
  })
  if (!curso) notFound()

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Editar Curso</h1>
        <p className="mt-1 text-sm text-zinc-500">{curso.nome}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <CursoForm
          defaultValues={{
            id: curso.id,
            nome: curso.nome,
            descricao: curso.descricao,
            valorMensalidade: curso.valorMensalidade?.toString() ?? null,
          }}
        />
      </div>
    </div>
  )
}
