import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ─── Dados base dos 20 alunos originais ───────────────────────────────────────

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

const CPFS = [
  '123.456.789-09', '234.567.890-12', '345.678.901-23', '456.789.012-34', '567.890.123-45',
  '678.901.234-56', '789.012.345-67', '890.123.456-78', '901.234.567-89', '012.345.678-90',
  '111.222.333-44', '222.333.444-55', '333.444.555-66', '444.555.666-77', '555.666.777-88',
  '666.777.888-99', '777.888.999-00', '888.999.000-11', '999.000.111-22', '100.200.300-40',
]

const NOMES_RESPONSAVEIS: (string | null)[] = [
  'Roberto Lima', 'Sandra Mendes', 'José Ferreira da Silva', 'Márcia Rocha',
  'Paulo Carvalho Nunes', 'Cláudia Oliveira', 'Fernando Alves Monteiro', null,
  'Vera dos Santos', 'Marcos Martins', 'Sônia de Almeida Costa', 'Fábio Lima',
  'Cristina Ferreira', 'Antônio Rodrigues de Souza', null, 'Eliane Teixeira Lopes',
  'Ricardo Neves', 'Patrícia de Carvalho', 'Henrique Moreira Silva', 'Simone Andrade',
]

// ─── Utilitários ──────────────────────────────────────────────────────────────

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

function hash(...args: number[]): number {
  return args.reduce((acc, n, i) => acc + n * [31, 17, 13, 7, 11][i % 5], 0)
}

function statusPresenca(ai: number, di: number, mi: number): 'PRESENTE' | 'AUSENTE' | 'ATRASADO' {
  const h = hash(ai, di, mi) % 100
  if (h < 10) return 'AUSENTE'
  if (h < 18) return 'ATRASADO'
  return 'PRESENTE'
}

function valorNota(ai: number, mi: number, mes: number): number {
  return 4.0 + (hash(ai, mi, mes) % 13) * 0.5
}

// ─── Simulação: geradores ─────────────────────────────────────────────────────

const PRIMEIROS_SIM = [
  'Ana', 'Bruno', 'Carlos', 'Daniela', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena',
  'Igor', 'Juliana', 'Kevin', 'Larissa', 'Mateus', 'Natália', 'Otávio', 'Paula',
  'Rafael', 'Sabrina', 'Thiago', 'Valentina', 'Alexandre', 'Beatriz', 'Caio',
  'Diana', 'Enzo', 'Flávia', 'Gustavo', 'Hannah', 'Ivan', 'Joana',
]
const SOBRENOMES_SIM = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Ferreira', 'Pereira', 'Costa',
  'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Freitas', 'Ribeiro', 'Gomes',
  'Martins', 'Rocha', 'Araújo', 'Moreira', 'Nunes', 'Cruz', 'Mendes', 'Teixeira',
  'Azevedo', 'Monteiro',
]
const DDDS_SIM    = ['11','21','31','41','51','61','71','81','85','62']
const CIDADES_SIM = [
  'São Paulo - SP', 'Rio de Janeiro - RJ', 'Belo Horizonte - MG', 'Curitiba - PR',
  'Porto Alegre - RS', 'Brasília - DF', 'Salvador - BA', 'Recife - PE',
  'Fortaleza - CE', 'Goiânia - GO',
]
const RUAS_SIM = [
  'Rua das Flores', 'Av. Brasil', 'Rua das Acácias', 'Rua Sete de Setembro',
  'Av. Paulista', 'Rua das Palmeiras', 'Rua do Comércio', 'Av. Central',
]

function gerarNomeSim(s: number): string {
  const p = PRIMEIROS_SIM[s % PRIMEIROS_SIM.length]
  const s1 = SOBRENOMES_SIM[(s * 7 + 3) % SOBRENOMES_SIM.length]
  const s2 = SOBRENOMES_SIM[(s * 13 + 7) % SOBRENOMES_SIM.length]
  return s % 3 === 0 ? `${p} ${s1} ${s2}` : `${p} ${s1}`
}
function gerarTelefoneSim(s: number): string {
  const ddd = DDDS_SIM[s % DDDS_SIM.length]
  const n = String(90000 + (s * 7919) % 9999).padStart(5, '9')
  const m = String(1000 + (s * 3571) % 8999)
  return `(${ddd}) 9${n}-${m}`
}
function gerarRGSim(s: number): string {
  const n = String(10000000 + (s * 1031) % 89999999)
  return `${n.slice(0, 2)}.${n.slice(2, 5)}.${n.slice(5, 8)}-${s % 10}`
}
function gerarEnderecoSim(s: number): string {
  const rua    = RUAS_SIM[s % RUAS_SIM.length]
  const num    = 10 + (s * 17) % 990
  const cidade = CIDADES_SIM[(s * 3) % CIDADES_SIM.length]
  return `${rua}, ${num}, ${cidade}`
}
function gerarCpfSim(s: number): string {
  const n = String(100000000 + (s * 9973) % 899999999).padStart(9, '0')
  const d1 = (s * 3 + 7) % 10
  const d2 = (s * 7 + 3) % 10
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${d1}${d2}`
}
function gerarResponsavelSim(s: number): string | null {
  if (s % 7 === 0) return null
  const p = PRIMEIROS_SIM[(s * 3 + 5) % PRIMEIROS_SIM.length]
  const b = SOBRENOMES_SIM[(s * 11) % SOBRENOMES_SIM.length]
  return `${p} ${b}`
}

// ─── Perfis de aluno para simulação ──────────────────────────────────────────
// Índice 0–13: regular | 14–15: reprova por nota | 16–17: reprova por falta
// 18: inadimplente | 19: reprova por nota + inadimplente

type PerfilAluno = 'regular' | 'reprova_nota' | 'reprova_falta' | 'inadimplente' | 'reprova_inadimplente'

function perfilAluno(i: number): PerfilAluno {
  if (i === 14 || i === 15) return 'reprova_nota'
  if (i === 16 || i === 17) return 'reprova_falta'
  if (i === 18)             return 'inadimplente'
  if (i === 19)             return 'reprova_inadimplente'
  return 'regular'
}

function presencaSim(p: PerfilAluno, ai: number, di: number, mi: number): 'PRESENTE' | 'AUSENTE' | 'ATRASADO' {
  const h = hash(ai, di, mi) % 100
  if (p === 'reprova_falta') {
    // 50% ausente — reprova por falta (limite típico: 25%)
    if (h < 50) return 'AUSENTE'
    if (h < 62) return 'ATRASADO'
    return 'PRESENTE'
  }
  // Regular: ~5% ausente, ~8% atrasado
  if (h < 5)  return 'AUSENTE'
  if (h < 13) return 'ATRASADO'
  return 'PRESENTE'
}

function notaSim(p: PerfilAluno, ai: number, mi: number, av: number): number {
  if (p === 'reprova_nota' || p === 'reprova_inadimplente') {
    return 2.0 + (hash(ai, mi, av) % 6) * 0.5  // 2.0 – 4.5
  }
  return 6.5 + (hash(ai, mi, av) % 8) * 0.5    // 6.5 – 10.0
}

function boletoStatusSim(p: PerfilAluno, vencimento: Date): 'PAGO' | 'PENDENTE' | 'VENCIDO' {
  const hoje = new Date('2026-04-24T00:00:00Z')
  if (p === 'inadimplente' || p === 'reprova_inadimplente') {
    return vencimento < hoje ? 'VENCIDO' : 'PENDENTE'
  }
  return vencimento < hoje ? 'PAGO' : 'PENDENTE'
}

// ─── Configuração dos 3 cursos da simulação ───────────────────────────────────

const CURSOS_SIM = [
  {
    key: 'adm', id: 'sim-curso-adm',
    nome: 'Administração de Empresas',
    descricao: 'Bacharelado em Administração com ênfase em gestão estratégica',
    valor: 1200,
    materias: [
      'Gestão de Pessoas', 'Marketing Digital',
      'Contabilidade Básica', 'Direito Empresarial', 'Logística e Supply Chain',
    ],
  },
  {
    key: 'design', id: 'sim-curso-design',
    nome: 'Design Digital',
    descricao: 'Tecnólogo em Design Digital com foco em UI/UX e motion',
    valor: 1400,
    materias: [
      'Fundamentos do Design', 'UI/UX Design',
      'Ilustração Digital', 'Motion Design', 'Branding e Identidade Visual',
    ],
  },
  {
    key: 'cc', id: 'sim-curso-cc',
    nome: 'Ciência da Computação',
    descricao: 'Bacharelado em Ciência da Computação',
    valor: 1600,
    materias: [
      'Estruturas de Dados', 'Programação Orientada a Objetos',
      'Redes de Computadores', 'Banco de Dados', 'Inteligência Artificial',
    ],
  },
]

const ANOS_SIM   = [2022, 2023, 2024, 2025, 2026]
const TURNOS_SIM = ['MANHA', 'TARDE', 'NOITE', 'MANHA', 'TARDE'] as const

function periodoTurma(ano: number) {
  if (ano < 2026) return {
    inicio: new Date(`${ano}-02-01T00:00:00.000Z`),
    fim:    new Date(`${ano}-11-30T00:00:00.000Z`),
  }
  return {
    inicio: new Date('2026-02-01T00:00:00.000Z'),
    fim:    new Date('2026-04-24T00:00:00.000Z'),
  }
}

function avaliacoesTurma(ano: number) {
  if (ano < 2026) return [
    { descricao: 'Prova de Fevereiro', data: new Date(`${ano}-02-28T12:00:00Z`) },
    { descricao: 'Prova de Abril',     data: new Date(`${ano}-04-30T12:00:00Z`) },
    { descricao: 'Prova de Julho',     data: new Date(`${ano}-07-31T12:00:00Z`) },
    { descricao: 'Prova de Outubro',   data: new Date(`${ano}-10-31T12:00:00Z`) },
  ]
  return [
    { descricao: 'Prova de Fevereiro', data: new Date('2026-02-28T12:00:00Z') },
    { descricao: 'Prova de Abril',     data: new Date('2026-04-10T12:00:00Z') },
  ]
}

function mesesBoleto(ano: number): number[] {
  return ano < 2026 ? [2,3,4,5,6,7,8,9,10,11] : [2,3,4]
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...')

  const staffPassword  = await bcrypt.hash('senha123', 10)
  const alunoPassword  = await bcrypt.hash('aluno123', 10)

  // ── Staff ──────────────────────────────────────────────────────────────────
  const diretor = await prisma.user.upsert({
    where:  { email: 'diretor@escola.dev' },
    update: {},
    create: { name: 'Diretor Silva', email: 'diretor@escola.dev', hashedPassword: staffPassword, role: 'DIRETOR' },
  })
  void diretor

  await prisma.user.upsert({
    where:  { email: 'financeira@escola.dev' },
    update: {},
    create: { name: 'Financeira Santos', email: 'financeira@escola.dev', hashedPassword: staffPassword, role: 'FINANCEIRA' },
  })
  await prisma.user.upsert({
    where:  { email: 'coordenador@escola.dev' },
    update: {},
    create: { name: 'Coordenador Oliveira', email: 'coordenador@escola.dev', hashedPassword: staffPassword, role: 'COORDENADOR' },
  })
  const professor = await prisma.user.upsert({
    where:  { email: 'professor@escola.dev' },
    update: {},
    create: { name: 'Professor Lima', email: 'professor@escola.dev', hashedPassword: staffPassword, role: 'PROFESSOR' },
  })
  console.log('  ✓ Staff criado')

  // ── Cursos originais ───────────────────────────────────────────────────────
  const curso1 = await prisma.curso.upsert({
    where:  { id: 'seed-curso-1' },
    update: {},
    create: { id: 'seed-curso-1', nome: 'Engenharia de Software', descricao: 'Curso de graduação em Engenharia de Software', valorMensalidade: 1500.0 },
  })
  const turma1 = await prisma.turma.upsert({
    where:  { id: 'seed-turma-1' },
    update: {},
    create: { id: 'seed-turma-1', nome: 'ES-2025-A', turno: 'MANHA', anoLetivo: '2025', cursoId: curso1.id },
  })
  const materias1 = await Promise.all(
    ['Algoritmos e Estruturas de Dados', 'Banco de Dados', 'Engenharia de Requisitos', 'Arquitetura de Software', 'Testes de Software']
      .map((nome, i) => prisma.materia.upsert({
        where:  { id: `seed-materia-${i + 1}` },
        update: {},
        create: { id: `seed-materia-${i + 1}`, nome, turmaId: turma1.id, instrutorId: i === 0 ? professor.id : null },
      }))
  )

  const curso2 = await prisma.curso.upsert({
    where:  { id: 'seed-curso-2' },
    update: {},
    create: { id: 'seed-curso-2', nome: 'Análise e Desenvolvimento de Sistemas', descricao: 'Curso tecnólogo em ADS', valorMensalidade: 1200.0 },
  })
  const turma2 = await prisma.turma.upsert({
    where:  { id: 'seed-turma-2' },
    update: {},
    create: { id: 'seed-turma-2', nome: 'ADS-2025-A', turno: 'NOITE', anoLetivo: '2025', cursoId: curso2.id },
  })
  const materias2 = await Promise.all(
    ['Lógica de Programação', 'Desenvolvimento Web', 'Sistemas Operacionais', 'Redes de Computadores', 'Gestão de Projetos de TI']
      .map((nome, i) => prisma.materia.upsert({
        where:  { id: `seed-materia-c2-${i + 1}` },
        update: {},
        create: { id: `seed-materia-c2-${i + 1}`, nome, turmaId: turma2.id, instrutorId: i === 0 ? professor.id : null },
      }))
  )
  console.log('  ✓ Cursos originais criados')

  // ── 21 alunos originais ────────────────────────────────────────────────────
  const alunoTeste = await prisma.aluno.upsert({
    where:  { email: 'aluno@escola.dev' },
    update: {},
    create: { nome: 'Aluno Teste', email: 'aluno@escola.dev', hashedPassword: alunoPassword, numeroCadastro: 'CAD-2025-00001', status: 'ATIVO' },
  })
  for (const m of materias1) {
    await prisma.matricula.upsert({
      where:  { alunoId_materiaId: { alunoId: alunoTeste.id, materiaId: m.id } },
      update: {},
      create: { alunoId: alunoTeste.id, materiaId: m.id, status: 'APROVADA' },
    })
  }

  for (let i = 0; i < NOMES.length; i++) {
    const email    = `aluno${String(i + 1).padStart(2, '0')}@escola.dev`
    const materias = i < 10 ? materias1 : materias2
    const aluno    = await prisma.aluno.upsert({
      where:  { email },
      update: { cpf: CPFS[i], telefone: TELEFONES[i], rg: RGS[i], endereco: ENDERECOS[i], nomeResponsavel: NOMES_RESPONSAVEIS[i] },
      create: {
        nome: NOMES[i], email, hashedPassword: alunoPassword,
        numeroCadastro: `CAD-2025-${String(i + 2).padStart(5, '0')}`, status: 'ATIVO',
        cpf: CPFS[i], telefone: TELEFONES[i], rg: RGS[i], endereco: ENDERECOS[i], nomeResponsavel: NOMES_RESPONSAVEIS[i],
      },
    })
    for (const m of materias) {
      await prisma.matricula.upsert({
        where:  { alunoId_materiaId: { alunoId: aluno.id, materiaId: m.id } },
        update: {},
        create: { alunoId: aluno.id, materiaId: m.id, status: 'APROVADA' },
      })
    }
  }

  // Notas e presenças dos 21 originais (fev–abr 2026)
  const seedEmails = ['aluno@escola.dev', ...Array.from({ length: 20 }, (_, i) => `aluno${String(i + 1).padStart(2, '0')}@escola.dev`)]
  const seedAlunos = await prisma.aluno.findMany({ where: { email: { in: seedEmails } }, include: { matriculas: true }, orderBy: { email: 'asc' } })
  const seedMatriculaIds = seedAlunos.flatMap(a => a.matriculas.map(m => m.id))
  const seedAlunoIds     = seedAlunos.map(a => a.id)
  await prisma.nota.deleteMany({ where: { matriculaId: { in: seedMatriculaIds } } })
  await prisma.presenca.deleteMany({ where: { alunoId: { in: seedAlunoIds } } })

  const diasOriginal   = diasUteis(new Date('2026-02-01T00:00:00Z'), new Date('2026-04-24T00:00:00Z'))
  const avalOriginal   = [
    { mes: 2, data: new Date('2026-02-28T12:00:00Z'), descricao: 'Prova de Fevereiro' },
    { mes: 3, data: new Date('2026-03-31T12:00:00Z'), descricao: 'Prova de Março' },
    { mes: 4, data: new Date('2026-04-10T12:00:00Z'), descricao: 'Prova de Abril' },
  ]
  for (let ai = 0; ai < seedAlunos.length; ai++) {
    const aluno = seedAlunos[ai]
    for (let mi = 0; mi < aluno.matriculas.length; mi++) {
      const mat = aluno.matriculas[mi]
      await prisma.nota.createMany({ data: avalOriginal.map(({ mes, data, descricao }) => ({ matriculaId: mat.id, valor: valorNota(ai, mi, mes), descricao, data })) })
      await prisma.presenca.createMany({ data: diasOriginal.map((data, di) => ({ alunoId: aluno.id, materiaId: mat.materiaId, data, status: statusPresenca(ai, di, mi) })) })
    }
  }
  console.log(`  ✓ 21 alunos originais com notas e presenças`)

  // ── SIMULAÇÃO: 3 cursos × 5 turmas × 20 alunos ────────────────────────────
  console.log('\n  Iniciando simulação de 5 anos...')

  let simAlunos = 0, simPresencas = 0, simNotas = 0, simBoletos = 0

  for (let ci = 0; ci < CURSOS_SIM.length; ci++) {
    const curso = CURSOS_SIM[ci]

    const cursoDB = await prisma.curso.upsert({
      where:  { id: curso.id },
      update: {},
      create: { id: curso.id, nome: curso.nome, descricao: curso.descricao, valorMensalidade: curso.valor },
    })

    for (let ai = 0; ai < ANOS_SIM.length; ai++) {
      const ano    = ANOS_SIM[ai]
      const turmaId = `sim-turma-${curso.key}-${ano}`

      const turmaDB = await prisma.turma.upsert({
        where:  { id: turmaId },
        update: {},
        create: { id: turmaId, nome: `${curso.key.toUpperCase()}-${ano}-A`, turno: TURNOS_SIM[ai], anoLetivo: String(ano), cursoId: cursoDB.id },
      })

      const materiasDB = await Promise.all(
        curso.materias.map((nome, mi) => prisma.materia.upsert({
          where:  { id: `sim-mat-${curso.key}-${ano}-${mi}` },
          update: {},
          create: { id: `sim-mat-${curso.key}-${ano}-${mi}`, nome, turmaId: turmaDB.id },
        }))
      )

      const { inicio, fim } = periodoTurma(ano)
      const dias       = diasUteis(inicio, fim)
      const avaliacoes = avaliacoesTurma(ano)
      const meses      = mesesBoleto(ano)

      // ── Passo 1: criar 20 alunos em paralelo ──────────────────────────────
      const alunosDB = await Promise.all(
        Array.from({ length: 20 }, (_, pi) => {
          const s     = ci * 100 + ai * 20 + pi
          const email = `${curso.key}.${ano}.${String(pi + 1).padStart(2, '0')}@escola.dev`
          const cad   = `CAD-${ano}-${String(10001 + ci * 100 + ai * 20 + pi).padStart(5, '0')}`
          return prisma.aluno.upsert({
            where:  { email },
            update: {},
            create: {
              nome:            gerarNomeSim(s),
              email,
              hashedPassword:  alunoPassword,
              numeroCadastro:  cad,
              status:          'ATIVO',
              cpf:             gerarCpfSim(s),
              telefone:        gerarTelefoneSim(s),
              rg:              gerarRGSim(s),
              endereco:        gerarEnderecoSim(s),
              nomeResponsavel: gerarResponsavelSim(s),
            },
            select: { id: true },
          })
        })
      )
      simAlunos += 20

      // ── Passo 2: matrículas em bulk ───────────────────────────────────────
      // Todos os alunos simulados têm matrícula APROVADA — a reprovação
      // é refletida nas notas (2.0–4.5) e presenças (50% ausente), não no status.
      const matriculaData = alunosDB.flatMap((aluno) =>
        materiasDB.map(mat => ({
          alunoId:   aluno.id,
          materiaId: mat.id,
          status:    'APROVADA' as const,
        }))
      )
      await prisma.matricula.createMany({ data: matriculaData, skipDuplicates: true })

      // Corrigir matrículas REJEITADA existentes (dados gerados pela versão anterior do seed)
      await prisma.matricula.updateMany({
        where: { alunoId: { in: alunosDB.map(a => a.id) }, status: 'REJEITADA' },
        data:  { status: 'APROVADA' },
      })

      // ── Passo 3: buscar IDs das matrículas ───────────────────────────────
      const matriculasDB = await prisma.matricula.findMany({
        where:  { alunoId: { in: alunosDB.map(a => a.id) }, materiaId: { in: materiasDB.map(m => m.id) } },
        select: { id: true, alunoId: true, materiaId: true },
      })
      const matMap = Object.fromEntries(matriculasDB.map(m => [`${m.alunoId}-${m.materiaId}`, m.id]))

      // ── Passo 4: limpar dados antigos (idempotência) ──────────────────────
      const ids = alunosDB.map(a => a.id)
      await prisma.nota.deleteMany({ where: { matricula: { alunoId: { in: ids } } } })
      await prisma.presenca.deleteMany({ where: { alunoId: { in: ids } } })
      await prisma.boleto.deleteMany({ where: { alunoId: { in: ids } } })

      // ── Passo 5: montar bulk arrays ───────────────────────────────────────
      const notasBulk: { matriculaId: string; valor: number; descricao: string; data: Date }[] = []
      const presencasBulk: { alunoId: string; materiaId: string; data: Date; status: 'PRESENTE' | 'AUSENTE' | 'ATRASADO' }[] = []
      const boletosBulk: {
        alunoId: string; cursoId: string; valor: number; mesReferencia: Date;
        dataVencimento: Date; dataPagamento: Date | null; status: 'PAGO' | 'PENDENTE' | 'VENCIDO';
        codigoBarras: string; linhaDigitavel: string
      }[] = []

      for (let pi = 0; pi < 20; pi++) {
        const p     = perfilAluno(pi)
        const aluno = alunosDB[pi]

        for (let mi = 0; mi < materiasDB.length; mi++) {
          const mat         = materiasDB[mi]
          const matriculaId = matMap[`${aluno.id}-${mat.id}`]
          if (!matriculaId) continue

          // Notas
          for (let avi = 0; avi < avaliacoes.length; avi++) {
            notasBulk.push({
              matriculaId,
              valor:    notaSim(p, pi, mi, avi),
              descricao: avaliacoes[avi].descricao,
              data:     avaliacoes[avi].data,
            })
          }

          // Presenças
          for (let di = 0; di < dias.length; di++) {
            presencasBulk.push({
              alunoId:   aluno.id,
              materiaId: mat.id,
              data:      dias[di],
              status:    presencaSim(p, pi, di, mi),
            })
          }
        }

        // Boletos
        for (const mes of meses) {
          const mesRef     = new Date(`${ano}-${String(mes).padStart(2, '0')}-01T00:00:00.000Z`)
          const vencimento = new Date(`${ano}-${String(mes).padStart(2, '0')}-10T00:00:00.000Z`)
          const status     = boletoStatusSim(p, vencimento)
          const cod        = `${ano}${String(mes).padStart(2, '0')}${aluno.id.slice(-6).toUpperCase()}`
          boletosBulk.push({
            alunoId:        aluno.id,
            cursoId:        cursoDB.id,
            valor:          curso.valor,
            mesReferencia:  mesRef,
            dataVencimento: vencimento,
            dataPagamento:  status === 'PAGO' ? new Date(`${ano}-${String(mes).padStart(2, '0')}-08T10:00:00.000Z`) : null,
            status,
            codigoBarras:   cod,
            linhaDigitavel: cod,
          })
        }
      }

      // ── Passo 6: bulk inserts ─────────────────────────────────────────────
      if (notasBulk.length > 0)
        await prisma.nota.createMany({ data: notasBulk, skipDuplicates: true })

      // Presenças em chunks de 5.000 para não sobrecarregar a memória
      for (let c = 0; c < presencasBulk.length; c += 5000)
        await prisma.presenca.createMany({ data: presencasBulk.slice(c, c + 5000), skipDuplicates: true })

      if (boletosBulk.length > 0)
        await prisma.boleto.createMany({ data: boletosBulk, skipDuplicates: true })

      simPresencas += presencasBulk.length
      simNotas     += notasBulk.length
      simBoletos   += boletosBulk.length

      console.log(`    ✓ ${curso.nome} ${ano} — ${dias.length} dias úteis, ${presencasBulk.length} presenças, ${boletosBulk.length} boletos`)
    }
  }

  // ── Resumo ─────────────────────────────────────────────────────────────────
  console.log('')
  console.log('✅ Seed complete!')
  console.log('')
  console.log('  Originais')
  console.log('    Staff (senha: senha123): diretor / financeira / coordenador / professor @escola.dev')
  console.log('    Alunos (senha: aluno123): aluno@escola.dev, aluno01–20@escola.dev')
  console.log('')
  console.log('  Simulação (senha: aluno123)')
  console.log(`    ${simAlunos} alunos — formato: {curso}.{ano}.{nn}@escola.dev`)
  console.log(`    Ex: adm.2022.01@escola.dev, design.2026.05@escola.dev, cc.2024.14@escola.dev`)
  console.log('')
  console.log('  Perfis por turma (índice 0–19):')
  console.log('    00–13: regulares (nota ≥ 6.5, presença ≥ 87%, em dia)')
  console.log('    14–15: reprovados por nota (média 2.0–4.5)')
  console.log('    16–17: reprovados por falta (50% de ausências)')
  console.log('    18:    inadimplente (todos os boletos VENCIDO)')
  console.log('    19:    reprova por nota + inadimplente')
  console.log('')
  console.log(`  Volume gerado pela simulação:`)
  console.log(`    ${simAlunos} alunos · ${simNotas} notas · ${simPresencas.toLocaleString('pt-BR')} presenças · ${simBoletos} boletos`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())