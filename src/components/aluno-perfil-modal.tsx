'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { buscarPerfilAluno } from '@/lib/actions/aluno'

// Tipo definido localmente para evitar import de type de arquivo 'use server'
type PerfilAlunoData = {
  id: string
  nome: string
  email: string | null
  cpf: string | null
  emailResponsavel: string | null
  nomeResponsavel: string | null
  telefone: string | null
  rg: string | null
  endereco: string | null
  numeroCadastro: string | null
  dataNascimento: string | null
  status: 'ATIVO' | 'PENDENTE' | 'INATIVO'
  createdAt: string
  matriculas: Array<{
    id: string
    status: 'PENDENTE' | 'APROVADA' | 'REJEITADA'
    dataInicio: string
    materia: { id: string; nome: string; turma: { id: string; nome: string } }
  }>
}

const statusAlunoLabels = {
  ATIVO:    { label: 'Ativo',    className: 'bg-green-100 text-green-700' },
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  INATIVO:  { label: 'Inativo',  className: 'bg-zinc-100 text-zinc-500' },
} as const

const statusMatriculaLabels = {
  PENDENTE:  { label: 'Pendente',  className: 'bg-amber-100 text-amber-700' },
  APROVADA:  { label: 'Aprovada',  className: 'bg-green-100 text-green-700' },
  REJEITADA: { label: 'Rejeitada', className: 'bg-red-100 text-red-600' },
} as const

interface Props {
  alunoId: string
  onClose: () => void
}

export function AlunoPerfilModal({ alunoId, onClose }: Props) {
  const [perfil, setPerfil] = useState<PerfilAlunoData | null>(null)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    setPerfil(null)
    setError(null)
    buscarPerfilAluno(alunoId)
      .then((res) => {
        if (res.ok) setPerfil(res.data ?? null)
        else setError(res.error)
      })
      .catch(() => setError('Erro ao carregar perfil.'))
  }, [alunoId])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl">

        {/* Cabeçalho */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 className="text-base font-semibold text-brand">
            {perfil ? perfil.nome : 'Carregando...'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>

        {/* Conteúdo rolável */}
        <div className="overflow-y-auto p-6">
          {!perfil && !error && <Spinner />}
          {error && <ErrorBox message={error} />}
          {perfil && <PerfilConteudo perfil={perfil} onClose={onClose} />}
        </div>

      </div>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{message}</p>
  )
}

function PerfilConteudo({ perfil, onClose }: { perfil: PerfilAlunoData; onClose: () => void }) {
  const alunoStatus = statusAlunoLabels[perfil.status]
  const aprovadas   = perfil.matriculas.filter((m) => m.status === 'APROVADA').length
  const pendentes   = perfil.matriculas.filter((m) => m.status === 'PENDENTE').length
  const rejeitadas  = perfil.matriculas.filter((m) => m.status === 'REJEITADA').length

  return (
    <div className="grid gap-6 lg:grid-cols-3">

      {/* Coluna esquerda */}
      <div className="lg:col-span-1">
        <div className="mb-4">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${alunoStatus.className}`}>
            {alunoStatus.label}
          </span>
        </div>

        <dl className="space-y-3 text-sm">
          {perfil.numeroCadastro && (
            <div>
              <dt className="text-zinc-400">Nº Cadastro</dt>
              <dd className="font-mono font-medium text-zinc-700">{perfil.numeroCadastro}</dd>
            </div>
          )}
          {perfil.cpf && (
            <div>
              <dt className="text-zinc-400">CPF</dt>
              <dd className="font-mono text-zinc-700">{perfil.cpf}</dd>
            </div>
          )}
          <div>
            <dt className="text-zinc-400">E-mail</dt>
            <dd className="text-zinc-700">{perfil.email ?? '—'}</dd>
          </div>
          {perfil.dataNascimento && (
            <div>
              <dt className="text-zinc-400">Nascimento</dt>
              <dd className="text-zinc-700">{perfil.dataNascimento}</dd>
            </div>
          )}
          {perfil.telefone && (
            <div>
              <dt className="text-zinc-400">Telefone</dt>
              <dd className="text-zinc-700">{perfil.telefone}</dd>
            </div>
          )}
          {perfil.rg && (
            <div>
              <dt className="text-zinc-400">RG</dt>
              <dd className="text-zinc-700">{perfil.rg}</dd>
            </div>
          )}
          {perfil.endereco && (
            <div>
              <dt className="text-zinc-400">Endereço</dt>
              <dd className="text-zinc-700">{perfil.endereco}</dd>
            </div>
          )}
          {(perfil.nomeResponsavel || perfil.emailResponsavel) && (
            <div className="border-t border-zinc-100 pt-3">
              <dt className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Responsável</dt>
              {perfil.nomeResponsavel && <dd className="text-zinc-700">{perfil.nomeResponsavel}</dd>}
              {perfil.emailResponsavel && <dd className="text-xs text-zinc-500">{perfil.emailResponsavel}</dd>}
            </div>
          )}
          <div>
            <dt className="text-zinc-400">Cadastrado em</dt>
            <dd className="text-zinc-700">{perfil.createdAt}</dd>
          </div>
        </dl>

        {/* Resumo de matrículas */}
        <div className="mt-5 border-t border-zinc-100 pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Matrículas</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-green-50 px-2 py-2">
              <p className="text-lg font-semibold text-green-700">{aprovadas}</p>
              <p className="text-xs text-green-600">Aprovadas</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-2 py-2">
              <p className="text-lg font-semibold text-amber-700">{pendentes}</p>
              <p className="text-xs text-amber-600">Pendentes</p>
            </div>
            <div className="rounded-lg bg-zinc-50 px-2 py-2">
              <p className="text-lg font-semibold text-zinc-500">{rejeitadas}</p>
              <p className="text-xs text-zinc-400">Rejeitadas</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href={`/alunos/${perfil.id}/notas`}
            onClick={onClose}
            className="block w-full rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Ver boletim
          </Link>
          <Link
            href={`/alunos/${perfil.id}/frequencia`}
            onClick={onClose}
            className="block w-full rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Ver frequência
          </Link>
          <Link
            href="/matriculas/nova"
            onClick={onClose}
            className="block w-full rounded-md border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            + Nova matrícula
          </Link>
        </div>
      </div>

      {/* Coluna direita: histórico */}
      <div className="lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-zinc-900">Histórico de Matrículas</h3>

        {perfil.matriculas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center">
            <p className="text-sm text-zinc-500">Nenhuma matrícula registrada.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Matéria</th>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Turma</th>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-3 py-2.5 text-left font-medium text-zinc-500">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {perfil.matriculas.map((m) => {
                  const badge = statusMatriculaLabels[m.status]
                  return (
                    <tr key={m.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{m.materia.nome}</td>
                      <td className="px-3 py-2.5 text-zinc-500">{m.materia.turma.nome}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400">{m.dataInicio}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}