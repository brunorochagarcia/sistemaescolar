import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { podeGerirAcademico, isDiretor } from '@/lib/auth/permissions'
import { CursoActions } from '@/components/curso-actions'
import Link from 'next/link'

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
      status: true,
      _count: { select: { turmas: true } },
    },
  })

  const podeExcluir = isDiretor(session.user.role)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Cursos</h1>
          <p className="mt-1 text-sm text-zinc-500">{cursos.length} curso(s) cadastrado(s)</p>
        </div>
        <Link
          href="/cursos/novo"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Novo curso
        </Link>
      </div>

      {cursos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum curso cadastrado.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Mensalidade</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Turmas</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {cursos.map((curso) => (
                <tr key={curso.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{curso.nome}</p>
                    {curso.descricao && (
                      <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{curso.descricao}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {curso.valorMensalidade
                      ? `R$ ${Number(curso.valorMensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{curso._count.turmas}</td>
                  <td className="px-4 py-3 text-right">
                    {podeExcluir ? (
                      <CursoActions cursoId={curso.id} />
                    ) : (
                      <Link
                        href={`/cursos/${curso.id}/editar`}
                        className="rounded-md border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                      >
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
