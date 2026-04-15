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
  { href: '/dashboard',       label: 'Dashboard',       roles: ['DIRETOR', 'FINANCEIRA', 'COORDENADOR', 'PROFESSOR', 'ALUNO'] as Role[] },
  { href: '/cadastros/alunos',label: 'Alunos',           roles: ['DIRETOR', 'COORDENADOR'] as Role[] },
  { href: '/cursos',          label: 'Cursos',           roles: ['DIRETOR', 'COORDENADOR'] as Role[] },
  { href: '/turmas',          label: 'Turmas',           roles: ['DIRETOR', 'COORDENADOR', 'PROFESSOR'] as Role[] },
  { href: '/matriculas',      label: 'Matrículas',       roles: ['DIRETOR', 'COORDENADOR', 'PROFESSOR', 'ALUNO'] as Role[] },
  { href: '/minhas-materias', label: 'Minhas Matérias',  roles: ['PROFESSOR'] as Role[] },
  { href: '/financeiro',      label: 'Financeiro',       roles: ['DIRETOR', 'FINANCEIRA'] as Role[] },
]

const roleLabels: Record<Role, string> = {
  DIRETOR:     'Diretor',
  FINANCEIRA:  'Financeira',
  COORDENADOR: 'Coordenador',
  PROFESSOR:   'Professor',
  ALUNO:       'Aluno',
}

export function Nav({ userName, userRole }: NavProps) {
  const pathname = usePathname()
  const visibleItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-brand">
      {/* Logo */}
      <div className="px-5 py-6">
        <span className="text-base font-semibold text-white">Sistema Escolar</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-white/20 font-medium text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User + logout */}
      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{userName}</p>
        <p className="mt-0.5 text-xs text-white/60">{roleLabels[userRole]}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-3 text-xs text-white/50 hover:text-white"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
