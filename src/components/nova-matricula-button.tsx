'use client'

import { useState } from 'react'
import { MatriculaForm } from './matricula-form'

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

interface NovaMatriculaButtonProps {
  alunos: Aluno[]
  materias: Materia[]
  turmas: Turma[]
  aprovacaoImediata: boolean
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function NovaMatriculaButton({ alunos, materias, turmas, aprovacaoImediata }: NovaMatriculaButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
      >
        + Nova matrícula
      </button>

      {open && (
        <Modal title="Nova matrícula" onClose={() => setOpen(false)}>
          {aprovacaoImediata && (
            <p className="mb-4 text-sm text-zinc-500">
              Como coordenador/diretor, você pode matricular o aluno diretamente como aprovado.
            </p>
          )}
          <MatriculaForm
            alunos={alunos}
            materias={materias}
            turmas={turmas}
            aprovacaoImediata={aprovacaoImediata}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  )
}
