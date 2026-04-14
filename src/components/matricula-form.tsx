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
  // Se true, o formulário usa criarMatriculaAprovada (bypass para COORDENADOR/DIRETOR)
  aprovacaoImediata?: boolean
}

export function MatriculaForm({ alunos, materias, turmas, aprovacaoImediata = false }: MatriculaFormProps) {
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
          router.push('/matriculas')
          return
        }
      } else if (aprovacaoImediata) {
        result = await criarMatriculaAprovada(formData)
      } else {
        result = await solicitarMatricula(formData)
      }

      if (result.ok) {
        router.push('/matriculas')
        router.refresh()
      } else {
        setError(result.error ?? 'Erro desconhecido.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toggle de modo */}
      <div className="flex gap-1 rounded-lg border border-zinc-200 p-1">
        <button
          type="button"
          onClick={() => setModo('materia')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            modo === 'materia'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Por matéria
        </button>
        <button
          type="button"
          onClick={() => setModo('turma')}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            modo === 'turma'
              ? 'bg-zinc-900 text-white'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          Turma inteira
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Aluno */}
        <div className="flex flex-col gap-1">
          <label htmlFor="alunoId" className="text-sm font-medium text-zinc-700">
            Aluno <span className="text-red-500">*</span>
          </label>
          <select
            id="alunoId"
            name="alunoId"
            required
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">Selecione um aluno</option>
            {alunos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome} {a.numeroCadastro ? `(${a.numeroCadastro})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Matéria ou Turma */}
        {modo === 'materia' ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="materiaId" className="text-sm font-medium text-zinc-700">
              Matéria <span className="text-red-500">*</span>
            </label>
            <select
              id="materiaId"
              name="materiaId"
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            >
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
            <label htmlFor="turmaId" className="text-sm font-medium text-zinc-700">
              Turma <span className="text-red-500">*</span>
            </label>
            <select
              id="turmaId"
              name="turmaId"
              required
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            >
              <option value="">Selecione uma turma</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-400">
              Cria uma matrícula PENDENTE para cada matéria da turma. Já matriculadas são ignoradas.
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-600">{success}</p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending
              ? 'Salvando...'
              : aprovacaoImediata
              ? 'Matricular (aprovado)'
              : 'Solicitar matrícula'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
