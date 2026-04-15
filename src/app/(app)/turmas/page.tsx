import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeGerirAcademico, isDiretor } from '@/lib/auth/permissions'
import { TurmasTable } from '@/components/turmas-table'

export const metadata = { title: 'Turmas — Sistema Escolar' }

export default async function TurmasPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if (!podeGerirAcademico(session.user.role)) redirect('/dashboard')

  const cursosRaw = await prisma.curso.findMany({
    orderBy: { nome: 'asc' },
    select: {
      id: true,
      nome: true,
      turmas: {
        orderBy: [{ anoLetivo: 'desc' }, { nome: 'asc' }],
        select: {
          id: true,
          nome: true,
          turno: true,
          anoLetivo: true,
          cursoId: true,
          _count: { select: { materias: true } },
        },
      },
    },
  })

  const grupos = cursosRaw.map((c) => ({
    id: c.id,
    nome: c.nome,
    turmas: c.turmas.map((t) => ({
      id: t.id,
      nome: t.nome,
      turno: t.turno,
      anoLetivo: t.anoLetivo,
      cursoId: t.cursoId,
      materiasCount: t._count.materias,
    })),
  }))

  const cursos = cursosRaw.map((c) => ({ id: c.id, nome: c.nome }))
  const totalTurmas = grupos.reduce((sum, g) => sum + g.turmas.length, 0)

  return (
    <div className="mx-auto max-w-5xl">
      <TurmasTable
        grupos={grupos}
        cursos={cursos}
        podeExcluir={isDiretor(session.user.role)}
        totalTurmas={totalTurmas}
      />
    </div>
  )
}
