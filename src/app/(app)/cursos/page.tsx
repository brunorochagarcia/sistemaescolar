import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeGerirAcademico, isDiretor } from '@/lib/auth/permissions'
import { CursosTable } from '@/components/cursos-table'

export const metadata = { title: 'Cursos — Sistema Escolar' }

export default async function CursosPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirAcademico(session.user.role)) redirect('/dashboard')

  const cursos = await prisma.curso.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      descricao: true,
      valorMensalidade: true,
      _count: { select: { turmas: true } },
    },
  })

  const rows = cursos.map((c) => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    valorMensalidade: c.valorMensalidade ? Number(c.valorMensalidade) : null,
    turmasCount: c._count.turmas,
  }))

  return (
    <div className="mx-auto max-w-5xl">
      <CursosTable cursos={rows} podeExcluir={isDiretor(session.user.role)} />
    </div>
  )
}
