'use client'

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
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

function SidebarContent({
  userName,
  userRole,
  visibleItems,
  pathname,
  onLinkClick,
}: {
  userName: string
  userRole: Role
  visibleItems: typeof navItems
  pathname: string
  onLinkClick?: () => void
}) {
  return (
    <>
      <div className="px-5 py-6">
        <span className="text-base font-semibold text-white">Sistema Escolar</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
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
    </>
  )
}

export function Nav({ userName, userRole }: NavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <>
      {/* ── Barra superior mobile ─────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-brand px-4 py-3 md:hidden">
        <span className="text-sm font-semibold text-white">Sistema Escolar</span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* ── Sidebar desktop (sempre visível) ─────────────────────────────── */}
      <aside className="hidden w-56 shrink-0 flex-col bg-brand md:flex">
        <SidebarContent
          userName={userName}
          userRole={userRole}
          visibleItems={visibleItems}
          pathname={pathname}
        />
      </aside>

      {/* ── Drawer mobile ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* painel */}
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand shadow-xl md:hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-semibold text-white">Sistema Escolar</span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 px-3">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    pathname.startsWith(item.href)
                      ? 'bg-white/20 font-medium text-white'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

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
        </>
      )}
    </>
  )
}