import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  const password = await bcrypt.hash('senha123', 10)

  // Create one user per role (staff)
  const diretor = await prisma.user.upsert({
    where: { email: 'diretor@escola.dev' },
    update: {},
    create: {
      name: 'Diretor Silva',
      email: 'diretor@escola.dev',
      hashedPassword: password,
      role: 'DIRETOR',
    },
  })

  const financeira = await prisma.user.upsert({
    where: { email: 'financeira@escola.dev' },
    update: {},
    create: {
      name: 'Financeira Santos',
      email: 'financeira@escola.dev',
      hashedPassword: password,
      role: 'FINANCEIRA',
    },
  })

  const coordenador = await prisma.user.upsert({
    where: { email: 'coordenador@escola.dev' },
    update: {},
    create: {
      name: 'Coordenador Oliveira',
      email: 'coordenador@escola.dev',
      hashedPassword: password,
      role: 'COORDENADOR',
    },
  })

  const professor = await prisma.user.upsert({
    where: { email: 'professor@escola.dev' },
    update: {},
    create: {
      name: 'Professor Lima',
      email: 'professor@escola.dev',
      hashedPassword: password,
      role: 'PROFESSOR',
    },
  })

  // Create 1 Curso
  const curso = await prisma.curso.upsert({
    where: { id: 'seed-curso-1' },
    update: {},
    create: {
      id: 'seed-curso-1',
      nome: 'Engenharia de Software',
      descricao: 'Curso de graduação em Engenharia de Software',
      valorMensalidade: 1500.0,
    },
  })

  // Create 1 Turma
  const turma = await prisma.turma.upsert({
    where: { id: 'seed-turma-1' },
    update: {},
    create: {
      id: 'seed-turma-1',
      nome: 'ES-2025-A',
      turno: 'MANHA',
      anoLetivo: '2025',
      cursoId: curso.id,
    },
  })

  // Create 5 Matérias
  const materiaNames = [
    'Algoritmos e Estruturas de Dados',
    'Banco de Dados',
    'Engenharia de Requisitos',
    'Arquitetura de Software',
    'Testes de Software',
  ]

  for (const [i, nome] of materiaNames.entries()) {
    await prisma.materia.upsert({
      where: { id: `seed-materia-${i + 1}` },
      update: {},
      create: {
        id: `seed-materia-${i + 1}`,
        nome,
        turmaId: turma.id,
        instrutorId: i === 0 ? professor.id : null, // first subject has a professor
      },
    })
  }

  console.log('✅ Seed complete!')
  console.log('  Users: diretor@escola.dev, financeira@escola.dev,')
  console.log('         coordenador@escola.dev, professor@escola.dev')
  console.log('  Password: senha123')
  console.log(`  Curso: ${curso.nome}`)
  console.log(`  Turma: ${turma.nome} (5 matérias)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
