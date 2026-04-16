import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const NOMES = [
  'Ana Lima',
  'Carlos Eduardo Mendes',
  'Maria das Graças Aparecida Ferreira da Silva',
  'João Pedro Rocha',
  'Beatriz Souza Carvalho Nunes',
  'Rafael de Oliveira',
  'Fernanda Cristina Alves Monteiro',
  'Lucas',
  'Natália Roberta dos Santos Pereira Gomes',
  'Diego Martins',
  'Isabela Cristiane de Almeida Nascimento Costa',
  'Thiago Lima',
  'Amanda Carolina Ferreira',
  'Gustavo Henrique Rodrigues de Souza',
  'Camila',
  'Pedro Augusto Teixeira Barbosa Lopes',
  'Juliana Neves',
  'Rodrigo de Carvalho',
  'Letícia Aparecida Moreira dos Santos Silva',
  'Felipe Andrade',
]

const TELEFONES = [
  '(11) 98234-5671', '(21) 97654-3210', '(31) 99123-4567', '(41) 98765-4321', '(51) 97891-2345',
  '(11) 93456-7890', '(21) 96789-0123', '(31) 95678-9012', '(41) 94567-8901', '(51) 93456-7890',
  '(11) 92345-6789', '(21) 91234-5678', '(31) 90123-4567', '(41) 99876-5432', '(51) 98765-4321',
  '(11) 97654-3219', '(21) 96543-2108', '(31) 95432-1097', '(41) 94321-0986', '(51) 93210-9875',
]

const RGS = [
  '12.345.678-9', '23.456.789-0', '34.567.890-1', '45.678.901-2', '56.789.012-3',
  '67.890.123-4', '78.901.234-5', '89.012.345-6', '90.123.456-7', '01.234.567-8',
  '11.223.344-5', '22.334.455-6', '33.445.566-7', '44.556.677-8', '55.667.788-9',
  '66.778.899-0', '77.889.900-1', '88.990.011-2', '99.001.122-3', '10.111.213-4',
]

const ENDERECOS = [
  'Rua das Flores, 123, Jardim Paulista, São Paulo - SP',
  'Av. Brasil, 456, Centro, Rio de Janeiro - RJ',
  'Rua Minas Gerais, 789, Savassi, Belo Horizonte - MG',
  'Rua XV de Novembro, 321, Centro, Curitiba - PR',
  'Av. Farroupilha, 654, Bom Fim, Porto Alegre - RS',
  'Rua do Comércio, 987, Centro, Salvador - BA',
  'Av. Paulista, 1500, Bela Vista, São Paulo - SP',
  'Rua Primeiro de Março, 22, Centro Histórico, Rio de Janeiro - RJ',
  'Rua Tupis, 171, Centro, Belo Horizonte - MG',
  'Rua Marechal Deodoro, 630, Centro, Curitiba - PR',
  'Rua dos Andradas, 1001, Centro Histórico, Porto Alegre - RS',
  'Rua Chile, 8, Comércio, Salvador - BA',
  'Alameda Santos, 200, Cerqueira César, São Paulo - SP',
  'Rua Visconde de Pirajá, 550, Ipanema, Rio de Janeiro - RJ',
  'Av. do Contorno, 6000, Funcionários, Belo Horizonte - MG',
  'Rua Padre Anchieta, 2500, Bigorrilho, Curitiba - PR',
  'Av. Ipiranga, 1200, Azenha, Porto Alegre - RS',
  'Rua Marquês de Caravelas, 83, Barra, Salvador - BA',
  'Rua Augusta, 890, Consolação, São Paulo - SP',
  'Av. Atlântica, 3880, Copacabana, Rio de Janeiro - RJ',
]

const NOMES_RESPONSAVEIS = [
  'Roberto Lima', 'Sandra Mendes', 'José Ferreira da Silva', 'Márcia Rocha',
  'Paulo Carvalho Nunes', 'Cláudia Oliveira', 'Fernando Alves Monteiro', null,
  'Vera dos Santos', 'Marcos Martins', 'Sônia de Almeida Costa', 'Fábio Lima',
  'Cristina Ferreira', 'Antônio Rodrigues de Souza', null, 'Eliane Teixeira Lopes',
  'Ricardo Neves', 'Patrícia de Carvalho', 'Henrique Moreira Silva', 'Simone Andrade',
]

// Dias úteis (seg–sex) entre duas datas (UTC)
function diasUteis(inicio: Date, fim: Date): Date[] {
  const dias: Date[] = []
  const atual = new Date(inicio)
  while (atual <= fim) {
    const dow = atual.getUTCDay()
    if (dow !== 0 && dow !== 6) dias.push(new Date(atual))
    atual.setUTCDate(atual.getUTCDate() + 1)
  }
  return dias
}

// Hash determinístico para gerar dados variados mas reproduzíveis
function hash(...args: number[]): number {
  return args.reduce((acc, n, i) => acc + n * [31, 17, 13, 7, 11][i % 5], 0)
}

function statusPresenca(ai: number, di: number, mi: number): 'PRESENTE' | 'AUSENTE' | 'ATRASADO' {
  const h = hash(ai, di, mi) % 100
  if (h < 10) return 'AUSENTE'
  if (h < 18) return 'ATRASADO'
  return 'PRESENTE'
}

// Notas de 4.0 a 10.0 em passos de 0.5 (13 valores possíveis)
function valorNota(ai: number, mi: number, mes: number): number {
  return 4.0 + (hash(ai, mi, mes) % 13) * 0.5
}

async function main() {
  console.log('🌱 Seeding database...')

  const staffPassword = await bcrypt.hash('senha123', 10)
  const alunoPassword = await bcrypt.hash('aluno123', 10)

  // ── Staff ────────────────────────────────────────────────────────────────────
  const diretor = await prisma.user.upsert({
    where: { email: 'diretor@escola.dev' },
    update: {},
    create: { name: 'Diretor Silva', email: 'diretor@escola.dev', hashedPassword: staffPassword, role: 'DIRETOR' },
  })

  await prisma.user.upsert({
    where: { email: 'financeira@escola.dev' },
    update: {},
    create: { name: 'Financeira Santos', email: 'financeira@escola.dev', hashedPassword: staffPassword, role: 'FINANCEIRA' },
  })

  await prisma.user.upsert({
    where: { email: 'coordenador@escola.dev' },
    update: {},
    create: { name: 'Coordenador Oliveira', email: 'coordenador@escola.dev', hashedPassword: staffPassword, role: 'COORDENADOR' },
  })

  const professor = await prisma.user.upsert({
    where: { email: 'professor@escola.dev' },
    update: {},
    create: { name: 'Professor Lima', email: 'professor@escola.dev', hashedPassword: staffPassword, role: 'PROFESSOR' },
  })

  console.log('  ✓ Staff criado')

  // ── Curso 1: Engenharia de Software ──────────────────────────────────────────
  const curso1 = await prisma.curso.upsert({
    where: { id: 'seed-curso-1' },
    update: {},
    create: {
      id: 'seed-curso-1',
      nome: 'Engenharia de Software',
      descricao: 'Curso de graduação em Engenharia de Software',
      valorMensalidade: 1500.0,
    },
  })

  const turma1 = await prisma.turma.upsert({
    where: { id: 'seed-turma-1' },
    update: {},
    create: { id: 'seed-turma-1', nome: 'ES-2025-A', turno: 'MANHA', anoLetivo: '2025', cursoId: curso1.id },
  })

  const materias1 = await Promise.all(
    ['Algoritmos e Estruturas de Dados', 'Banco de Dados', 'Engenharia de Requisitos', 'Arquitetura de Software', 'Testes de Software']
      .map((nome, i) =>
        prisma.materia.upsert({
          where: { id: `seed-materia-${i + 1}` },
          update: {},
          create: { id: `seed-materia-${i + 1}`, nome, turmaId: turma1.id, instrutorId: i === 0 ? professor.id : null },
        })
      )
  )

  console.log('  ✓ Curso 1 (Engenharia de Software) criado')

  // ── Curso 2: Análise e Desenvolvimento de Sistemas ───────────────────────────
  const curso2 = await prisma.curso.upsert({
    where: { id: 'seed-curso-2' },
    update: {},
    create: {
      id: 'seed-curso-2',
      nome: 'Análise e Desenvolvimento de Sistemas',
      descricao: 'Curso tecnólogo em Análise e Desenvolvimento de Sistemas',
      valorMensalidade: 1200.0,
    },
  })

  const turma2 = await prisma.turma.upsert({
    where: { id: 'seed-turma-2' },
    update: {},
    create: { id: 'seed-turma-2', nome: 'ADS-2025-A', turno: 'NOITE', anoLetivo: '2025', cursoId: curso2.id },
  })

  const materias2 = await Promise.all(
    ['Lógica de Programação', 'Desenvolvimento Web', 'Sistemas Operacionais', 'Redes de Computadores', 'Gestão de Projetos de TI']
      .map((nome, i) =>
        prisma.materia.upsert({
          where: { id: `seed-materia-c2-${i + 1}` },
          update: {},
          create: { id: `seed-materia-c2-${i + 1}`, nome, turmaId: turma2.id, instrutorId: i === 0 ? professor.id : null },
        })
      )
  )

  console.log('  ✓ Curso 2 (ADS) criado')

  // ── Aluno de teste ────────────────────────────────────────────────────────────
  const alunoTeste = await prisma.aluno.upsert({
    where: { email: 'aluno@escola.dev' },
    update: {},
    create: { nome: 'Aluno Teste', email: 'aluno@escola.dev', hashedPassword: alunoPassword, numeroCadastro: 'CAD-2025-00001', status: 'ATIVO' },
  })

  for (const materia of materias1) {
    await prisma.matricula.upsert({
      where: { alunoId_materiaId: { alunoId: alunoTeste.id, materiaId: materia.id } },
      update: {},
      create: { alunoId: alunoTeste.id, materiaId: materia.id, status: 'APROVADA' },
    })
  }

  console.log('  ✓ Aluno de teste criado (aluno@escola.dev / aluno123)')

  // ── 20 alunos: 10 no curso 1, 10 no curso 2 ──────────────────────────────────
  for (let i = 0; i < NOMES.length; i++) {
    const emailAluno = `aluno${String(i + 1).padStart(2, '0')}@escola.dev`
    const materias = i < 10 ? materias1 : materias2

    const aluno = await prisma.aluno.upsert({
      where: { email: emailAluno },
      update: {
        telefone:        TELEFONES[i],
        rg:              RGS[i],
        endereco:        ENDERECOS[i],
        nomeResponsavel: NOMES_RESPONSAVEIS[i],
      },
      create: {
        nome:            NOMES[i],
        email:           emailAluno,
        hashedPassword:  alunoPassword,
        numeroCadastro:  `CAD-2025-${String(i + 2).padStart(5, '0')}`,
        status:          'ATIVO',
        telefone:        TELEFONES[i],
        rg:              RGS[i],
        endereco:        ENDERECOS[i],
        nomeResponsavel: NOMES_RESPONSAVEIS[i],
      },
    })

    for (const materia of materias) {
      await prisma.matricula.upsert({
        where: { alunoId_materiaId: { alunoId: aluno.id, materiaId: materia.id } },
        update: {},
        create: { alunoId: aluno.id, materiaId: materia.id, status: 'APROVADA' },
      })
    }
  }

  console.log('  ✓ 20 alunos criados (aluno01-10 → ES, aluno11-20 → ADS)')

  // ── Notas e Presenças (fev–abr 2026) ─────────────────────────────────────────
  const seedEmails = [
    'aluno@escola.dev',
    ...Array.from({ length: 20 }, (_, i) => `aluno${String(i + 1).padStart(2, '0')}@escola.dev`),
  ]

  // Busca todos os alunos seed com matriculas, em ordem estável
  const seedAlunos = await prisma.aluno.findMany({
    where: { email: { in: seedEmails } },
    include: { matriculas: true },
    orderBy: { email: 'asc' },
  })

  // Limpa dados anteriores (idempotência)
  const matriculaIds = seedAlunos.flatMap((a) => a.matriculas.map((m) => m.id))
  const alunoIds = seedAlunos.map((a) => a.id)
  await prisma.nota.deleteMany({ where: { matriculaId: { in: matriculaIds } } })
  await prisma.presenca.deleteMany({ where: { alunoId: { in: alunoIds } } })

  const dias = diasUteis(new Date('2026-02-01T00:00:00Z'), new Date('2026-04-15T00:00:00Z'))

  const avaliacoes = [
    { mes: 2, data: new Date('2026-02-28T12:00:00Z'), descricao: 'Prova de Fevereiro' },
    { mes: 3, data: new Date('2026-03-31T12:00:00Z'), descricao: 'Prova de Março' },
    { mes: 4, data: new Date('2026-04-10T12:00:00Z'), descricao: 'Prova de Abril' },
  ]

  for (let ai = 0; ai < seedAlunos.length; ai++) {
    const aluno = seedAlunos[ai]

    for (let mi = 0; mi < aluno.matriculas.length; mi++) {
      const matricula = aluno.matriculas[mi]

      // 1 nota por mês (3 avaliações)
      await prisma.nota.createMany({
        data: avaliacoes.map(({ mes, data, descricao }) => ({
          matriculaId: matricula.id,
          valor: valorNota(ai, mi, mes),
          descricao,
          data,
        })),
      })

      // 1 presença por dia útil (por matéria)
      await prisma.presenca.createMany({
        data: dias.map((data, di) => ({
          alunoId: aluno.id,
          materiaId: matricula.materiaId,
          data,
          status: statusPresenca(ai, di, mi),
        })),
      })
    }
  }

  const totalPresencas = seedAlunos.length * 5 * dias.length
  const totalNotas = seedAlunos.length * 5 * avaliacoes.length

  console.log(`  ✓ ${totalNotas} notas criadas (3 avaliações × 5 matérias × ${seedAlunos.length} alunos)`)
  console.log(`  ✓ ${totalPresencas} presenças criadas (${dias.length} dias úteis × 5 matérias × ${seedAlunos.length} alunos)`)

  // ── Resumo ────────────────────────────────────────────────────────────────────
  console.log('')
  console.log('✅ Seed complete!')
  console.log('')
  console.log('  Staff (senha: senha123)')
  console.log('    diretor@escola.dev / financeira@escola.dev')
  console.log('    coordenador@escola.dev / professor@escola.dev')
  console.log('')
  console.log('  Aluno de teste (senha: aluno123)')
  console.log('    aluno@escola.dev')
  console.log('')
  console.log('  Alunos em massa (senha: aluno123)')
  console.log('    aluno01-10@escola.dev → Engenharia de Software')
  console.log('    aluno11-20@escola.dev → Análise e Desenvolvimento de Sistemas')
  console.log('')
  console.log('  Cursos')
  console.log(`    [1] ${curso1.nome} — turma ${turma1.nome} (5 matérias)`)
  console.log(`    [2] ${curso2.nome} — turma ${turma2.nome} (5 matérias)`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
