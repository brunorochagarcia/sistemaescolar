# Sistema Escolar

Sistema de gestão escolar completo construído com Next.js 16, Prisma 7, NextAuth v5 e PostgreSQL.

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Banco:** PostgreSQL via Prisma 7 (adapter `@prisma/adapter-pg`)
- **Auth:** NextAuth v5 beta.30 (JWT strategy, Credentials provider)
- **E-mail:** Resend
- **PDF:** @react-pdf/renderer
- **Validação:** Zod v4
- **Testes:** Vitest (17 testes unitários — lógica pura de médias, situação e boletos)
- **UI:** Tailwind CSS v4

## Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| Autenticação | Login com roles: DIRETOR, FINANCEIRA, COORDENADOR, PROFESSOR, ALUNO |
| Cadastros | Registro público de alunos, aprovação com numeroCadastro sequencial |
| Estrutura acadêmica | CRUD de Cursos, Turmas, Matérias com atribuição de professor |
| Matrículas | Solicitação individual ou por turma, aprovação com IDOR por role |
| Notas | Lançamento, edição, exclusão com cálculo de média (notas brutas) |
| Frequência | Chamada por matéria/turma, percentual, alerta via e-mail |
| Financeiro | Boletos proporcionais, cron handler, PDF, notificação via Resend |

## Desenvolvimento local

### Pré-requisitos

- Node.js 20+
- Docker (para o PostgreSQL)

### Setup

```bash
# 1. Clonar e instalar
git clone https://github.com/brunorochagarcia/sistemaescolar.git
cd sistemaescolar
npm install

# 2. Variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com seus valores (DATABASE_URL já aponta para o Docker abaixo)

# 3. Banco de dados (Docker)
docker compose up -d

# 4. Migrations e seed
npx prisma migrate deploy
npm run db:seed

# 5. Servidor de desenvolvimento
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Usuários do seed

**Staff** (senha: `senha123`)

| E-mail | Role |
|--------|------|
| diretor@escola.dev | DIRETOR |
| financeira@escola.dev | FINANCEIRA |
| coordenador@escola.dev | COORDENADOR |
| professor@escola.dev | PROFESSOR |

**Alunos** (senha: `aluno123`)

| E-mail | Perfil |
|--------|--------|
| aluno@escola.dev | aluno de teste básico |
| aluno01@escola.dev … aluno20@escola.dev | alunos originais |

**Simulação — 300 alunos** no formato `{curso}.{ano}.{nn}@escola.dev` (senha: `aluno123`):

| Exemplo | Perfil |
|---------|--------|
| adm.2025.01@escola.dev | regular (nota ≥ 6.5, frequência ≥ 87%, em dia) |
| cc.2024.14@escola.dev | reprovado por nota (média 2.0–4.5) |
| design.2023.16@escola.dev | reprovado por falta (50% de ausências) |
| adm.2026.18@escola.dev | inadimplente (todos os boletos VENCIDO) |
| cc.2025.19@escola.dev | reprova por nota + inadimplente |

Cursos disponíveis: `adm`, `design`, `cc` · Anos: 2022–2026

### Testar o cron localmente

```bash
curl -X POST http://localhost:3000/api/cron/boletos \
  -H "Authorization: Bearer change-me-before-production"
```

### Testes

```bash
npm run test:run
```

---

## Deploy em produção

### 1. Banco — Neon

1. Criar conta em [neon.tech](https://neon.tech)
2. Criar projeto e copiar a `DATABASE_URL` (formato `postgresql://...?sslmode=require`)
3. Rodar migration em produção (**não** usar `migrate dev`):
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```
4. Rodar seed uma vez:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:seed
   ```

### 2. Deploy — Vercel

1. Criar conta em [vercel.com](https://vercel.com) e conectar o repositório
2. Configurar as variáveis de ambiente no painel Vercel:

   | Variável | Como obter |
   |----------|------------|
   | `DATABASE_URL` | URL do Neon |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
   | `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (portfólio) ou domínio verificado |
   | `CRON_SECRET` | `openssl rand -base64 32` |
   | `NEXT_PUBLIC_URL` | URL pública gerada pela Vercel |

3. Deploy automático via `git push origin main`

### 3. Cron — cron-job.org

1. Criar conta gratuita em [cron-job.org](https://cron-job.org)
2. Criar job com:
   - **URL:** `https://sua-url.vercel.app/api/cron/boletos`
   - **Método:** POST
   - **Header:** `Authorization: Bearer {CRON_SECRET}`
   - **Schedule:** `0 6 1 * *` (dia 1 de cada mês, 6h UTC)

### 4. Resend (e-mail)

**Portfólio / demonstração:** usar `onboarding@resend.dev` como `RESEND_FROM_EMAIL` — funciona sem domínio próprio, mas só entrega para o e-mail do dono da conta Resend.

**Produção com usuários reais:** verificar um domínio próprio no painel Resend (DNS, até 48h).

### Smoke tests pós-deploy

- [ ] Login com `diretor@escola.dev` / `senha123`
- [ ] `/register` cria aluno com status PENDENTE
- [ ] COORDENADOR aprova aluno → `numeroCadastro` gerado (`CAD-2026-00001`)
- [ ] Cron gera boleto com valor proporcional correto
- [ ] E-mail de boleto aparece nos logs do Resend

---

## Arquitetura

```
src/
├── app/
│   ├── (app)/              # Rotas autenticadas (layout com nav)
│   │   ├── dashboard/
│   │   ├── cadastros/alunos/
│   │   ├── cursos/
│   │   ├── turmas/[id]/{chamada,notas,materias/nova}
│   │   ├── matriculas/
│   │   ├── alunos/[id]/{notas,frequencia}
│   │   ├── minhas-materias/
│   │   └── financeiro/boletos/[id]
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   └── cron/boletos/   # POST — protegido por CRON_SECRET
│   ├── login/
│   └── register/           # Público
├── lib/
│   ├── actions/            # Server Actions (5 passos: auth→role→zod→ownership→execute)
│   ├── calculo/            # Lógica pura testável (média, situação, boleto)
│   ├── schemas/            # Zod schemas (fonte de verdade dos tipos)
│   ├── auth/permissions.ts # Predicados centralizados de role
│   ├── prisma.ts           # Singleton com PrismaPg adapter
│   └── env.ts              # Validação de env vars no build
├── components/             # Client Components (formulários, ações, PDF)
└── generated/prisma/       # Tipos gerados pelo Prisma (gitignored)
```

### Segurança IDOR

- `PROFESSOR` — só aprova matrículas/lança notas em matérias onde é instrutor
- `ALUNO` — só solicita matrícula para si mesmo (`aluno.email === session.user.email`)
- `FINANCEIRA` — acesso exclusivo ao módulo financeiro
