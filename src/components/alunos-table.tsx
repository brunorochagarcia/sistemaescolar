'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { editarAluno, criarAlunoAdmin } from '@/lib/actions/aluno'
import { AlunoActions } from './aluno-actions'

export interface AlunoRow {
  id: string
  nome: string
  email: string | null
  emailResponsavel: string | null
  dataNascimento: string | null  // YYYY-MM-DD ou null
  numeroCadastro: string | null
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
        <Field label="E-mail do responsável" optional>
          <input name="emailResponsavel" type="email" defaultValue={aluno.emailResponsavel ?? ''} className={inputCls} />
        </Field>
        <Field label="Data de nascimento" optional>
          <input name="dataNascimento" type="date" defaultValue={aluno.dataNascimento ?? ''} className={inputCls} />
        </Field>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl bg-brand-light px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light/80">
            Cancelar
          </button>
          <button type="submit" disabled={isPending} className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50">
            {isPending ? 'Salvando...' : 'Salvar'}
          </button>
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
        <Field label="E-mail do responsável" optional>
          <input name="emailResponsavel" type="email" placeholder="responsavel@email.com" className={inputCls} />
        </Field>
        <Field label="Data de nascimento" optional>
          <input name="dataNascimento" type="date" className={inputCls} />
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

// ── Tabela principal ──────────────────────────────────────────────────────────

interface AlunosTableProps {
  alunos: AlunoRow[]
}

export function AlunosTable({ alunos }: AlunosTableProps) {
  const [editando, setEditando] = useState<AlunoRow | null>(null)
  const [criando, setCriando] = useState(false)

  const pendentes = alunos.filter((a) => a.status === 'PENDENTE')
  const ativos    = alunos.filter((a) => a.status === 'ATIVO')

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Alunos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            {pendentes.length > 0 && (
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

      {/* Tabela */}
      {alunos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center">
          <p className="text-zinc-500">Nenhum aluno cadastrado ainda.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-100 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Nº Matrícula</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {alunos.map((aluno) => {
                const badge = statusLabels[aluno.status]
                return (
                  <tr key={aluno.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900" title={aluno.nome}>
                      {primeiroEUltimoNome(aluno.nome)}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-500">{aluno.numeroCadastro ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/alunos/${aluno.id}`}
                          className="rounded-xl bg-brand-light px-3 py-1 text-xs font-medium text-brand hover:bg-brand-light/80"
                        >
                          Perfil
                        </Link>
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
      )}

      {/* Modais */}
      {editando && <EditarModal aluno={editando} onClose={() => setEditando(null)} />}
      {criando  && <CriarModal onClose={() => setCriando(false)} />}
    </>
  )
}
