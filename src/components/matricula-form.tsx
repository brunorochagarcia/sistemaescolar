'use client'

import { solicitarMatricula, solicitarMatriculaTurma, criarMatriculaAprovada } from '@/lib/actions/matricula'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Aluno {
  id: string
  nome: string
  numeroCadastro: string | null
}

interface Materia {
  id: string
  nome: string
  turma: { id: string; nome: string }
}

interface Turma {
  id: string
  nome: string
}

type Modo = 'materia' | 'turma'

interface MatriculaFormProps {
  alunos: Aluno[]
  materias: Materia[]
  turmas: Turma[]
  aprovacaoImediata?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

const inputCls = 'rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/20'

export function MatriculaForm({ alunos, materias, turmas, aprovacaoImediata = false, onSuccess, onCancel }: MatriculaFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [modo, setModo] = useState<Modo>('materia')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      let result: { ok: boolean; error?: string }

      if (modo === 'turma') {
        result = await solicitarMatriculaTurma(formData)
        if (result.ok) {
          setSuccess('Matrículas solicitadas com sucesso!')
          if (onSuccess) {
            router.refresh()
            onSuccess()
          } else {
            router.push('/matriculas')
          }
          return
        }
      } else if (aprovacaoImediata) {
        result = await criarMatriculaAprovada(formData)
      } else {
        result = await solicitarMatricula(formData)
      }

      if (result.ok) {
        if (onSuccess) {
          router.refresh()
          onSuccess()
        } else {
          router.push('/matriculas')
          router.refresh()
        }
      } else {
        setError(result.error ?? 'Erro desconhecido.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle de modo */}
      <div className="flex gap-1 rounded-xl border border-zinc-200 p-1">
        <button
          type="button"
          onClick={() => setModo('materia')}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            modo === 'materia' ? 'bg-brand text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Por matéria
        </button>
        <button
          type="button"
          onClick={() => setModo('turma')}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            modo === 'turma' ? 'bg-brand text-white' : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Turma inteira
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Aluno <span className="text-red-500">*</span>
          </label>
          <select name="alunoId" required className={inputCls}>
            <option value="">Selecione um aluno</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} {a.numeroCadastro ? `(${a.numeroCadastro})` : ''}
              </option>
            ))}
          </select>
        </div>

        {modo === 'materia' ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">
              Matéria <span className="text-red-500">*</span>
            </label>
            <select name="materiaId" required className={inputCls}>
              <option value="">Selecione uma matéria</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} — {m.turma.nome}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700">
              Turma <span className="text-red-500">*</span>
            </label>
            <select name="turmaId" required className={inputCls}>
              <option value="">Selecione uma turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <p className="text-xs text-zinc-400">
              Cria uma matrícula PENDENTE para cada matéria da turma. Já matriculadas são ignoradas.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-600">{success}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onCancel ? onCancel() : router.back()}
            className="rounded-xl bg-brand-light px-4 py-2 text-sm font-medium text-brand hover:bg-brand-light/80"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
          >
            {isPending
              ? 'Salvando...'
              : aprovacaoImediata
              ? 'Matricular (aprovado)'
              : 'Solicitar matrícula'}
          </button>
        </div>
      </form>
    </div>
  )
}
