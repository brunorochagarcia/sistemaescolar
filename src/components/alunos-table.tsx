'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { editarAluno, criarAlunoAdmin, excluirAluno } from '@/lib/actions/aluno'
import { AlunoActions } from './aluno-actions'
import { AlunoPerfilModal } from './aluno-perfil-modal'

export interface AlunoRow {
  id: string
  nome: string
  email: string | null
  cpf: string | null
  emailResponsavel: string | null
  nomeResponsavel: string | null
  telefone: string | null
  rg: string | null
  endereco: string | null
  dataNascimento: string | null  // YYYY-MM-DD ou null
  numeroCadastro: string | null
  cursos: string[]
  status: 'ATIVO' | 'PENDENTE' | 'INATIVO'
  createdAt: string
}

function primeiroEUltimoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 2) return nome
  return `${partes[0]} ${partes[partes.length - 1]}`
}

const statusLabels = {
  ATIVO:    { label: 'Ativo',    className: 'bg-green-100 text-green-700' },
  PENDENTE: { label: 'Pendente', className: 'bg-amber-100 text-amber-700' },
  INATIVO:  { label: 'Inativo',  className: 'bg-zinc-100 text-zinc-500' },
} as const

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Campo de formulário ───────────────────────────────────────────────────────

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">
        {label}{' '}
        {optional && <span className="font-normal text-zinc-400">(opcional)</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'rounded-xl border border-brand/20 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20'

// ── Modal: Editar ─────────────────────────────────────────────────────────────

function EditarModal({ aluno, onClose }: { aluno: AlunoRow; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDeactivating, startDeactivateTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('alunoId', aluno.id)
    setError(null)
    startTransition(async () => {
      const res = await editarAluno(fd)
      if (res.ok) { router.refresh(); onClose() }
      else setError(res.error)
    })
  }

  function handleDesativar() {
    if (!confirm('Desativar este aluno? O histórico será preservado.')) return
    const fd = new FormData()
    fd.set('alunoId', aluno.id)
    startDeactivateTransition(async () => {
      const res = await excluirAluno(fd)
      if (res.ok) { router.refresh(); onClose() }
      else setError(res.error)
    })
  }

  return (
    <Modal title="Editar aluno" onClose={onClose}>
      {/* Info somente leitura */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-brand-light/40 px-4 py-3 text-xs text-zinc-600">
        <div><span className="font-medium">Nº Cadastro</span><br />{aluno.numeroCadastro ?? '—'}</div>
        <div><span className="font-medium">Status</span><br />{statusLabels[aluno.status].label}</div>
        <div className="col-span-2"><span className="font-medium">Cadastrado em</span><br />{aluno.createdAt}</div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Nome completo">
          <input name="nome" type="text" required defaultValue={aluno.nome} className={inputCls} />
        </Field>
        <Field label="E-mail">
          <input name="email" type="email" required defaultValue={aluno.email ?? ''} className={inputCls} />
        </Field>
        <Field label="CPF" optional>
          <input name="cpf" type="text" defaultValue={aluno.cpf ?? ''} placeholder="000.000.000-00" className={inputCls} />
        </Field>
        <Field label="Data de nascimento" optional>
          <input name="dataNascimento" type="date" defaultValue={aluno.dataNascimento ?? ''} className={inputCls} />
        </Field>
        <Field label="Telefone" optional>
          <input name="telefone" type="tel" defaultValue={aluno.telefone ?? ''} placeholder="(11) 99999-9999" className={inputCls} />
        </Field>
        <Field label="RG" optional>
          <input name="rg" type="text" defaultValue={aluno.rg ?? ''} placeholder="00.000.000-0" className={inputCls} />
        </Field>
        <Field label="Endereço" optional>
          <input name="endereco" type="text" defaultValue={aluno.endereco ?? ''} placeholder="Rua, número, bairro, cidade" className={inputCls} />
        </Field>
        <Field label="Nome do responsável" optional>
          <input name="nomeResponsavel" type="text" defaultValue={aluno.nomeResponsavel ?? ''} className={inputCls} />
        </Field>
        <Field label="E-mail do responsável" optional>
          <input name="emailResponsavel" type="email" defaultValue={aluno.emailResponsavel ?? ''} className={inputCls} />
        </Field>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-1 flex items-center justify-between gap-2">
          {aluno.status !== 'INATIVO' ? (
            <button
              type="button"
              onClick={handleDesativar}
              disabled={isDeactivating || isPending}
              className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
            >
              {isDeactivating ? 'Desativando...' : 'Desativar aluno'}
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-brand-light px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light/80">
              Cancelar
            </button>
            <button type="submit" disabled={isPending || isDeactivating} className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50">
              {isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ── Modal: Criar ──────────────────────────────────────────────────────────────

function CriarModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await criarAlunoAdmin(fd)
      if (res.ok) { router.refresh(); onClose() }
      else setError(res.error)
    })
  }

  return (
    <Modal title="Novo aluno" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Nome completo">
          <input name="nome" type="text" required placeholder="Maria da Silva" className={inputCls} />
        </Field>
        <Field label="E-mail">
          <input name="email" type="email" required placeholder="maria@email.com" className={inputCls} />
        </Field>
        <Field label="Senha de acesso">
          <input name="senha" type="password" required placeholder="mínimo 6 caracteres" className={inputCls} />
        </Field>
        <Field label="CPF" optional>
          <input name="cpf" type="text" placeholder="000.000.000-00" className={inputCls} />
        </Field>
        <Field label="Data de nascimento" optional>
          <input name="dataNascimento" type="date" className={inputCls} />
        </Field>
        <Field label="Telefone" optional>
          <input name="telefone" type="tel" placeholder="(11) 99999-9999" className={inputCls} />
        </Field>
        <Field label="RG" optional>
          <input name="rg" type="text" placeholder="00.000.000-0" className={inputCls} />
        </Field>
        <Field label="Endereço" optional>
          <input name="endereco" type="text" placeholder="Rua, número, bairro, cidade" className={inputCls} />
        </Field>
        <Field label="Nome do responsável" optional>
          <input name="nomeResponsavel" type="text" placeholder="Nome completo do responsável" className={inputCls} />
        </Field>
        <Field label="E-mail do responsável" optional>
          <input name="emailResponsavel" type="email" placeholder="responsavel@email.com" className={inputCls} />
        </Field>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-brand-light px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light/80">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50">
            {isPending ? 'Criando...' : 'Criar aluno'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Ordenação e paginação ─────────────────────────────────────────────────────

type SortCol = 'nome' | 'cursos' | 'status'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER = { ATIVO: 0, PENDENTE: 1, INATIVO: 2 }

function sortAlunos(rows: AlunoRow[], col: SortCol, dir: SortDir): AlunoRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0
    if (col === 'nome') {
      cmp = primeiroEUltimoNome(a.nome).localeCompare(primeiroEUltimoNome(b.nome), 'pt-BR')
    } else if (col === 'cursos') {
      cmp = (a.cursos[0] ?? '').localeCompare(b.cursos[0] ?? '', 'pt-BR')
    } else if (col === 'status') {
      cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    }
    return dir === 'asc' ? cmp : -cmp
  })
}

const PAGE_SIZE = 20

// ── Tabela principal ──────────────────────────────────────────────────────────

interface AlunosTableProps {
  alunos: AlunoRow[]
}

export function AlunosTable({ alunos }: AlunosTableProps) {
  const [editando, setEditando] = useState<AlunoRow | null>(null)
  const [criando, setCriando] = useState(false)
  const [perfilId, setPerfilId] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('nome')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)
  const [busca, setBusca] = useState('')

  const pendentes = alunos.filter((a) => a.status === 'PENDENTE')
  const ativos    = alunos.filter((a) => a.status === 'ATIVO')

  const termo = busca.trim().toLowerCase()
  const filtrados = termo
    ? alunos.filter(
        (a) =>
          a.nome.toLowerCase().includes(termo) ||
          (a.email ?? '').toLowerCase().includes(termo) ||
          (a.numeroCadastro ?? '').toLowerCase().includes(termo) ||
          (a.cpf ?? '').replace(/\D/g, '').includes(termo.replace(/\D/g, '')) ||
          (a.cpf ?? '').toLowerCase().includes(termo),
      )
    : alunos

  const sorted     = sortAlunos(filtrados, sortCol, sortDir)
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(1)
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <span className="ml-1 text-zinc-300">↕</span>
    return <span className="ml-1 text-zinc-600">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Alunos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {termo
              ? `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''} de ${ativos.length} ativo${ativos.length !== 1 ? 's' : ''}`
              : `${ativos.length} ativo${ativos.length !== 1 ? 's' : ''}`}
            {!termo && pendentes.length > 0 && (
              <span className="ml-2 font-medium text-amber-600">
                · {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''} de aprovação
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setCriando(true)}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
        >
          + Novo aluno
        </button>
      </div>

      {/* Busca */}
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nome, e-mail, CPF ou nº cadastro..."
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setPage(1) }}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-200 sm:max-w-sm"
        />
      </div>

      {/* Tabela */}
      {alunos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum aluno cadastrado ainda.</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum aluno encontrado para &quot;{busca}&quot;.</p>
          <button onClick={() => setBusca('')} className="mt-2 text-sm text-zinc-400 hover:text-zinc-700 hover:underline">
            Limpar busca
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-100 bg-zinc-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('nome')} className="flex items-center font-medium text-zinc-500 hover:text-zinc-900">
                      Nome <SortIcon col="nome" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Matrícula</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">CPF</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('cursos')} className="flex items-center font-medium text-zinc-500 hover:text-zinc-900">
                      Curso <SortIcon col="cursos" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('status')} className="flex items-center font-medium text-zinc-500 hover:text-zinc-900">
                      Status <SortIcon col="status" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginated.map((aluno) => {
                  const badge = statusLabels[aluno.status]
                  return (
                    <tr key={aluno.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium">
                        <button
                          onClick={() => setPerfilId(aluno.id)}
                          title={aluno.nome}
                          className="text-left text-zinc-900 hover:underline"
                        >
                          {primeiroEUltimoNome(aluno.nome)}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {aluno.numeroCadastro ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                        {aluno.cpf ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {aluno.cursos.length > 0 ? aluno.cursos.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditando(aluno)}
                            className="rounded-xl bg-brand-light px-3 py-1 text-xs font-medium text-brand hover:bg-brand-light/80"
                          >
                            Editar
                          </button>
                          <AlunoActions alunoId={aluno.id} status={aluno.status} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
              <span>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} de {sorted.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="rounded-lg px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg px-3 py-1.5 ${p === page ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-100'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modais */}
      {editando  && <EditarModal aluno={editando} onClose={() => setEditando(null)} />}
      {criando   && <CriarModal onClose={() => setCriando(false)} />}
      {perfilId  && <AlunoPerfilModal alunoId={perfilId} onClose={() => setPerfilId(null)} />}
    </>
  )
}
