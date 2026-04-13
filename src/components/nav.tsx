'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/generated/prisma/enums'

interface NavProps {
  userName: string
  userRole: Role
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', roles: ['DIRETOR', 'FINANCEIRA', 'COORDENADOR', 'PROFESSOR', 'ALUNO'] as Role[] },
  { href: '/cadastros/alunos', label: 'Alunos', roles: ['DIRETOR', 'COORDENADOR'] as Role[] },
  { href: '/cursos', label: 'Cursos', roles: ['DIRETOR', 'COORDENADOR'] as Role[] },
  { href: '/turmas', label: 'Turmas', roles: ['DIRETOR', 'COORDENADOR', 'PROFESSOR'] as Role[] },
  { href: '/financeiro', label: 'Financeiro', roles: ['DIRETOR', 'FINANCEIRA'] as Role[] },
]

const roleLabels: Record<Role, string> = {
  DIRETOR: 'Diretor',
  FINANCEIRA: 'Financeira',
  COORDENADOR: 'Coordenador',
  PROFESSOR: 'Professor',
  ALUNO: 'Aluno',
}

export function Nav({ userName, userRole }: NavProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <nav className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-zinc-900">EscolaFull</span>
        <div className="flex items-center gap-1">
          {visibleItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-zinc-100 font-medium text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-500">
          {userName}{' '}
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-600">
            {roleLabels[userRole]}
          </span>
        </span>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          Sair
        </button>
      </div>
    </nav>
  )
}
