'use client'

import { registrarAluno } from '@/lib/actions/aluno'
import { useState, useTransition } from 'react'

export function RegisterForm() {
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    setError(null)
    startTransition(async () => {
      const result = await registrarAluno(formData)
      if (result.ok) {
        setSuccess(true)
      } else {
        setError(result.error)
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-md bg-green-50 px-4 py-6 text-center">
        <p className="font-medium text-green-800">Cadastro enviado!</p>
        <p className="mt-1 text-sm text-green-700">
          Aguarde a aprovação da coordenação. Você será notificado em breve.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="nome" className="text-sm font-medium text-zinc-700">
          Nome completo <span className="text-red-500">*</span>
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          autoComplete="name"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          placeholder="Maria da Silva"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          E-mail <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          placeholder="maria@email.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="emailResponsavel" className="text-sm font-medium text-zinc-700">
          E-mail do responsável{' '}
          <span className="font-normal text-zinc-400">(opcional)</span>
        </label>
        <input
          id="emailResponsavel"
          name="emailResponsavel"
          type="email"
          autoComplete="off"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
          placeholder="responsavel@email.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="dataNascimento" className="text-sm font-medium text-zinc-700">
          Data de nascimento{' '}
          <span className="font-normal text-zinc-400">(opcional)</span>
        </label>
        <input
          id="dataNascimento"
          name="dataNascimento"
          type="date"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
      >
        {isPending ? 'Enviando...' : 'Solicitar cadastro'}
      </button>

      <p className="text-center text-sm text-zinc-500">
        Já tem conta?{' '}
        <a href="/login" className="font-medium text-zinc-900 hover:underline">
          Entrar
        </a>
      </p>
    </form>
  )
}
