import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/enums'

export const { handlers, auth, signIn, signOut } = NextAuth({
  // No adapter needed — JWT strategy stores session in cookie, not DB
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const email = credentials.email as string
        const password = credentials.password as string

        // Check User table (staff)
        const user = await prisma.user.findUnique({ where: { email } })
        if (user) {
          const ok = await bcrypt.compare(password, user.hashedPassword)
          if (!ok) return null
          return { id: user.id, name: user.name, email: user.email, role: user.role }
        }

        // Check Aluno table (students login with their email)
        const aluno = await prisma.aluno.findUnique({
          where: { email },
          select: { id: true, nome: true, email: true, status: true, hashedPassword: true },
        })
        if (!aluno || aluno.status !== 'ATIVO' || !aluno.hashedPassword) return null
        const alunoOk = await bcrypt.compare(password, aluno.hashedPassword)
        if (!alunoOk) return null
        return { id: aluno.id, name: aluno.nome, email: aluno.email, role: 'ALUNO' as Role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
})

// Extend next-auth types
declare module 'next-auth' {
  interface User {
    role: Role
  }
  interface Session {
    user: {
      id: string
      role: Role
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

// JWT augmentation: @auth/core/jwt module path varies by next-auth version
// Types are handled inline in callbacks above — no augmentation needed
