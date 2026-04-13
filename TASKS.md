# TASKS — Sistema Escolar

Checklist detalhado de implementação. Marcar com `[x]` conforme conclui.
Arquivo vive em `sistemaescolar/TASKS.md`.

---

## Sprint 1 — Fundação ✅ CONCLUÍDO

- [x] `npx create-next-app` com TypeScript, Tailwind, ESLint, App Router, `src/`
- [x] Instalar dependências: `next-auth`, `@prisma/client`, `@prisma/adapter-pg`, `pg`, `zod`, `bcryptjs`, `resend`, `dotenv`
- [x] Instalar devDeps: `prisma`, `tsx`, `vitest`, `@vitejs/plugin-react`, `vite-tsconfig-paths`
- [x] `prisma/schema.prisma` completo (enums + todos os models)
- [x] `prisma.config.ts` com URL do banco (Prisma 7)
- [x] `npx prisma migrate dev --name init` — migration `20260413131934_init` aplicada
- [x] `prisma/seed.ts` — 5 usuários (DIRETOR, FINANCEIRA, COORDENADOR, PROFESSOR + User), 1 Curso, 1 Turma, 5 Matérias
- [x] `npm run db:seed` — banco populado
- [x] `src/lib/prisma.ts` — singleton com `PrismaPg` adapter (Prisma 7 requer adapter)
- [x] `src/auth.ts` — NextAuth v5 beta.30, JWT strategy, Credentials provider
- [x] `src/app/api/auth/[...nextauth]/route.ts` — handlers GET/POST
- [x] `proxy.ts` — proteção de rotas (Next.js 16: proxy.ts, não middleware.ts)
- [x] `src/lib/env.ts` — Zod valida todas as env vars no build
- [x] `src/lib/auth/permissions.ts` — predicados centralizados de role
- [x] `src/lib/schemas/` — pasta criada
- [x] `vitest.config.ts` — configurado com react plugin + tsconfig paths
- [x] `.env` com DATABASE_URL, AUTH_SECRET, RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET, NEXT_PUBLIC_URL
- [x] Docker PostgreSQL rodando (`escola-pg`, porta 5432, database `sistemaescolar`)
- [x] `npm run dev` — servidor em http://localhost:3000

---

## Sprint 2 — Cadastros ✅ CONCLUÍDO

- [x] `src/lib/schemas/aluno.ts` — schemas Zod: `registrarAlunoSchema`, `aprovarAlunoSchema`, `excluirAlunoSchema`
- [x] `src/lib/actions/aluno.ts` — Server Actions:
  - [x] `registrarAluno` (público, cria Aluno com status PENDENTE)
  - [x] `aprovarAluno` (DIRETOR/COORDENADOR — gera numeroCadastro dentro de `$transaction()`)
  - [x] `excluirAluno` (soft delete — status INATIVO, histórico preservado)
- [x] Todas as Actions seguem o padrão 5 passos: auth → role → zod → ownership → execute
- [x] `src/app/login/page.tsx` + `src/components/login-form.tsx`
- [x] `src/app/register/page.tsx` + `src/components/register-form.tsx` (público)
- [x] `src/app/(app)/layout.tsx` — layout autenticado com nav (route group)
- [x] `src/components/nav.tsx` — navegação responsiva a roles, botão de logout
- [x] `src/app/(app)/dashboard/page.tsx` — contadores por role, ações rápidas
- [x] `src/app/(app)/cadastros/alunos/page.tsx` — tabela de alunos com aprovar/desativar
- [x] `src/components/aluno-actions.tsx` — botões Aprovar/Desativar com `useTransition`
- [x] `src/app/page.tsx` — redireciona para `/dashboard`

---

## Sprint 3 — Estrutura Acadêmica

### Schemas e Actions

- [ ] `src/lib/schemas/curso.ts` — `criarCursoSchema`, `editarCursoSchema`
- [ ] `src/lib/schemas/turma.ts` — `criarTurmaSchema`, `editarTurmaSchema`
- [ ] `src/lib/schemas/materia.ts` — `criarMateriaSchema`, `editarMateriaSchema`
- [ ] `src/lib/actions/curso.ts`:
  - [ ] `criarCurso` (DIRETOR/COORDENADOR)
  - [ ] `editarCurso` (DIRETOR/COORDENADOR)
  - [ ] `excluirCurso` (DIRETOR) — checar se não há turmas vinculadas antes de excluir
- [ ] `src/lib/actions/turma.ts`:
  - [ ] `criarTurma` (DIRETOR/COORDENADOR)
  - [ ] `editarTurma` (DIRETOR/COORDENADOR)
  - [ ] `excluirTurma` (DIRETOR) — checar se não há matrículas vinculadas
- [ ] `src/lib/actions/materia.ts`:
  - [ ] `criarMateria` (DIRETOR/COORDENADOR)
  - [ ] `editarMateria` (DIRETOR/COORDENADOR)
  - [ ] `atribuirInstrutor` (DIRETOR/COORDENADOR — seta instrutorId)
  - [ ] `excluirMateria` (DIRETOR/COORDENADOR)

### Pages

- [ ] `src/app/(app)/cursos/page.tsx` — lista de cursos com valorMensalidade
- [ ] `src/app/(app)/cursos/novo/page.tsx` — formulário criar curso
- [ ] `src/app/(app)/cursos/[id]/editar/page.tsx` — formulário editar curso
- [ ] `src/app/(app)/turmas/page.tsx` — lista de turmas agrupadas por curso
- [ ] `src/app/(app)/turmas/nova/page.tsx` — formulário criar turma (select de Curso)
- [ ] `src/app/(app)/turmas/[id]/page.tsx` — detalhe da turma com lista de matérias
- [ ] `src/app/(app)/turmas/[id]/editar/page.tsx` — formulário editar turma
- [ ] `src/app/(app)/turmas/[id]/materias/nova/page.tsx` — adicionar matéria à turma
- [ ] Atualizar nav em `src/components/nav.tsx` — adicionar links Cursos/Turmas

### Guards

- [ ] Todas as pages de `/cursos` e `/turmas`: guard `podeGerirAcademico(role)`
- [ ] Atribuição de instrutor: guard adicional verificando se o User tem role PROFESSOR

---

## Sprint 4 — Matrículas

### Schemas e Actions

- [ ] `src/lib/schemas/matricula.ts` — `solicitarMatriculaSchema`, `aprovarMatriculaSchema`, `rejeitarMatriculaSchema`
- [ ] `src/lib/actions/matricula.ts`:
  - [ ] `solicitarMatricula` — ALUNO solicita por Matéria; COORDENADOR/DIRETOR em nome do aluno
    - Verifica se aluno está ATIVO (não PENDENTE, não INATIVO)
    - Cria com status PENDENTE
    - Guard IDOR: se role === 'ALUNO', verificar `session.user.id === alunoId`
  - [ ] `solicitarMatriculaTurma` — enrollment em bloco: cria N Matrículas (uma por Matéria da Turma)
    - Usa `prisma.matricula.createMany({ skipDuplicates: true })` — idempotente
  - [ ] `aprovarMatricula` — PROFESSOR (só das próprias matérias) ou COORDENADOR/DIRETOR
    - Guard IDOR para PROFESSOR: verificar `materia.instrutorId === session.user.id`
    - Matéria sem instrutorId: somente COORDENADOR/DIRETOR podem aprovar
  - [ ] `rejeitarMatricula` — mesmas regras de `aprovarMatricula`
  - [ ] `criarMatriculaAprovada` — bypass direto para COORDENADOR/DIRETOR (cria já APROVADA)

### Pages

- [ ] `src/app/(app)/matriculas/page.tsx` — lista de matrículas (filtro por status, aluno, turma)
- [ ] `src/app/(app)/matriculas/nova/page.tsx` — formulário solicitar matrícula
  - Select de Aluno (ATIVO) + Select de Matéria ou Turma inteira
- [ ] `src/app/(app)/alunos/[id]/page.tsx` — perfil do aluno com suas matrículas
- [ ] Para PROFESSOR: `/minhas-materias` — lista das matérias onde é instrutor, com matrículas pendentes

### Guards

- [ ] Todas as pages: guard mínimo `podeSolicitarMatricula(role)` para listagem
- [ ] Aprovação/Rejeição: guard `podeAprovarMatricula(role)` + ownership check para PROFESSOR

---

## Sprint 5 — Notas e Médias

### Testes (escrever ANTES da implementação — TDD)

- [ ] `src/lib/calculo/__tests__/media.test.ts`:
  - [ ] Matéria A com notas [8, 6] → média 7.0
  - [ ] Turma com matéria A:[8,6] + matéria B:[10] → média = (8+6+10)/3 = **8.0** (não 8.5)
  - [ ] Nenhuma nota → média null (não 0)
  - [ ] Uma única nota [10] → média 10.0
- [ ] `src/lib/calculo/__tests__/situacao.test.ts`:
  - [ ] Média ≥ 7.0 → 'APROVADO'
  - [ ] Média < 7.0 e matéria em andamento → 'EM_ANDAMENTO'
  - [ ] Média < 7.0 e matéria encerrada → 'REPROVADO'

### Lógica pura (sem banco)

- [ ] `src/lib/calculo/media.ts`:
  - [ ] `calcularMediaMateria(notas: number[]): number | null`
  - [ ] `calcularMediaTurma(notasPorMateria: number[][]): number | null` — soma tudo, divide pelo total
  - [ ] `calcularMediaCurso(notasPorTurma: number[][][]): number | null` — idem, sem média das médias
- [ ] `src/lib/calculo/situacao.ts`:
  - [ ] `calcularSituacao(media: number | null, encerrada: boolean): 'APROVADO' | 'REPROVADO' | 'EM_ANDAMENTO'`

### Schemas e Actions

- [ ] `src/lib/schemas/nota.ts` — `lancarNotaSchema` (valor: 0-10, descrição, matriculaId)
- [ ] `src/lib/actions/nota.ts`:
  - [ ] `lancarNota` (PROFESSOR da matéria ou DIRETOR/COORDENADOR)
    - Verificar que `matricula.status === 'APROVADA'` antes de aceitar nota
    - Guard IDOR para PROFESSOR: `materia.instrutorId === session.user.id`
  - [ ] `editarNota` (mesmo guard)
  - [ ] `excluirNota` (mesmo guard)

### Pages

- [ ] `src/app/(app)/turmas/[id]/notas/page.tsx` — lançamento de notas por turma (PROFESSOR/COORDENADOR)
- [ ] `src/app/(app)/alunos/[id]/notas/page.tsx` — boletim do aluno: Curso → Turma → Matéria → notas + médias
- [ ] `src/components/situacao-badge.tsx` — badge Aprovado (verde) / Reprovado (vermelho) / Em Andamento (cinza)
- [ ] Executar todos os testes: `npm run test:run`

---

## Sprint 6 — Chamada e Frequência

### Schemas e Actions

- [ ] `src/lib/schemas/presenca.ts` — `salvarChamadaSchema` (data, turmaId ou materiaId, lista de alunoId + status)
- [ ] `src/lib/actions/presenca.ts`:
  - [ ] `salvarChamada` (PROFESSOR da matéria ou COORDENADOR/DIRETOR)
    - Rodar dentro de `prisma.$transaction()`
    - Validar que todos os alunoIds têm status ATIVO antes de salvar
    - Guard IDOR para PROFESSOR: verificar `materia.instrutorId === session.user.id`
  - [ ] `recalcularFrequencia(alunoId, turmaId)` — retorna percentual de presença
  - [ ] `notificarAluno(alunoId)` — enviar e-mail via Resend (aluno + responsável)
    - Só envia se `aluno.alertaEnviado === false` (sem duplicar alertas)
    - Após envio: `prisma.aluno.update({ data: { alertaEnviado: true } })`

### Pages

- [ ] `src/app/(app)/turmas/[id]/chamada/page.tsx` — grade de chamada (PROFESSOR/COORDENADOR)
  - Coluna por data, linha por aluno, status PRESENTE/AUSENTE/ATRASADO
- [ ] `src/app/(app)/alunos/[id]/frequencia/page.tsx` — histórico de presença do aluno
  - `FrequenciaBadge`: verde ≥ 75%, amarelo 50–74%, vermelho < 50%
  - Paginação: implementar cursor simples apenas se a lista travar (YAGNI)
- [ ] Botão "Notificar aluno" no perfil (DIRETOR/COORDENADOR)

### Alertas automáticos (stretch goal — só depois do resto funcionar)

- [ ] `notificarTodos` — percorre todos os alunos com frequência < 75% e dispara alertas

---

## Sprint 7 — Financeiro

> **BLOCKER:** Definir período de cobrança antes de implementar `gerarBoletos`.
> Ver item em `TODOS.md`. Decisão recomendada: aprovação no mês M gera boleto no mês M+1.

### Testes (escrever ANTES — TDD)

- [ ] `src/lib/calculo/__tests__/boleto.test.ts`:
  - [ ] 5 matérias na turma, aluno com 3 APROVADAS, mensalidade R$1.000 → boleto R$600
  - [ ] 5 matérias, 0 APROVADAS → boleto R$0 (não gerar boleto)
  - [ ] Chamar `gerarBoletos` duas vezes no mesmo mês → apenas 1 boleto (idempotência)
  - [ ] Valor proporcional correto: `valorMensalidade / totalMaterias * qtdAprovadas`

### Lógica pura

- [ ] `src/lib/calculo/boleto.ts`:
  - [ ] `calcularValorBoleto(valorMensalidade: number, totalMaterias: number, qtdAprovadas: number): number`

### Schemas e Actions

- [ ] `src/lib/schemas/boleto.ts` — `marcarPagoSchema`, `cancelarBoletoSchema`
- [ ] `src/lib/actions/boleto.ts`:
  - [ ] `gerarBoletos(mesReferencia: Date)` — chamado pelo cron handler
    - Buscar todos os alunos ATIVO com matrículas APROVADA
    - **NÃO usar N+1**: usar `prisma.matricula.groupBy({ by: ['alunoId'], _count: true })` → Map para lookup O(1)
    - Para cada aluno: calcular valor proporcional
    - Se valor = 0: pular (não gerar boleto)
    - Usar `prisma.boleto.upsert` — idempotente pelo `@@unique([alunoId, cursoId, mesReferencia])`
    - Tratar `P2002` como sucesso (race condition em requests simultâneas)
    - Gerar `codigoBarras` e `linhaDigitavel` simulados (string aleatória)
  - [ ] `marcarPago(boletoId)` (DIRETOR/FINANCEIRA)
    - Validar `boleto.status === 'PENDENTE'` ou `'VENCIDO'` antes de marcar
  - [ ] `cancelarBoleto(boletoId)` (DIRETOR/FINANCEIRA)
    - Validar que boleto não está PAGO antes de cancelar
  - [ ] `enviarEmailBoleto(boletoId)` — e-mail com link para download do PDF (não anexo)

### Route Handler

- [ ] `src/app/api/cron/boletos/route.ts` — POST handler
  - Verificar header `Authorization: Bearer {CRON_SECRET}`
  - Chamar `gerarBoletos(meAtual)`
  - Teste local: `curl -X POST http://localhost:3000/api/cron/boletos -H "Authorization: Bearer change-me-before-production"`

### Pages

- [ ] `src/app/(app)/financeiro/page.tsx` — listagem de boletos (DIRETOR/FINANCEIRA)
  - Filtros: status, mês, aluno
  - Ações: marcar pago, cancelar, reenviar e-mail
- [ ] `src/app/(app)/financeiro/boletos/[id]/page.tsx` — detalhe do boleto + PDF
- [ ] `src/components/pdf-boleto.tsx` — Client Component com `@react-pdf/renderer`
  - `dynamic(() => import('./pdf-boleto'), { ssr: false })` — obrigatório
  - Instalar: `npm install @react-pdf/renderer`
- [ ] Executar todos os testes: `npm run test:run`

---

## Sprint 8 — Deploy

> **BLOCKER:** Decidir sobre Resend + domínio antes de iniciar.
> Ver item em `TODOS.md`.

### Preparação

- [ ] Verificar versão exata do next-auth: `npm ls next-auth` — **não rodar `npm update`**
- [ ] Criar conta Neon (neon.tech) — PostgreSQL serverless gratuito
- [ ] Criar conta Vercel (vercel.com)
- [ ] Criar conta cron-job.org (gratuito)
- [ ] Decidir sobre domínio para Resend (ver TODOS.md)

### Banco de dados em produção

- [ ] Criar projeto no Neon
- [ ] Copiar `DATABASE_URL` do Neon (formato `postgresql://...?sslmode=require`)
- [ ] Rodar migration em produção: `npx prisma migrate deploy` (não `migrate dev`)
- [ ] Rodar seed em produção (apenas uma vez): `npm run db:seed`

### Deploy Vercel

- [ ] Conectar repositório GitHub ao Vercel
- [ ] Configurar variáveis de ambiente no painel Vercel:
  - [ ] `DATABASE_URL` — URL do Neon
  - [ ] `AUTH_SECRET` — gerar com `openssl rand -base64 32`
  - [ ] `RESEND_API_KEY` — chave da conta Resend
  - [ ] `RESEND_FROM_EMAIL` — e-mail do remetente (domínio verificado ou `onboarding@resend.dev`)
  - [ ] `CRON_SECRET` — gerar com `openssl rand -base64 32`
  - [ ] `NEXT_PUBLIC_URL` — URL pública da Vercel (ex: `https://sistemaescolar.vercel.app`)
- [ ] Fazer deploy: `git push origin main` → Vercel faz build automático
- [ ] Verificar se login funciona na URL pública

### Cron em produção

- [ ] Criar job no cron-job.org:
  - URL: `https://sua-url.vercel.app/api/cron/boletos`
  - Método: POST
  - Header: `Authorization: Bearer {CRON_SECRET}`
  - Schedule: `0 6 1 * *` (dia 1 de cada mês, 6h UTC)
- [ ] Testar manualmente: disparar o cron e verificar boletos gerados

### Resend (e-mail)

- [ ] Se domínio próprio: verificar DNS no painel Resend (propagação: até 48h)
- [ ] Se portfólio sem audiência real: usar `onboarding@resend.dev` como remetente
- [ ] Testar envio de e-mail de boleto na URL pública

### Smoke tests pós-deploy

- [ ] Login com `diretor@escola.dev` / `senha123` funciona
- [ ] `/register` cria aluno com status PENDENTE
- [ ] COORDENADOR aprova aluno → numeroCadastro gerado (ex: `CAD-2026-00001`)
- [ ] Aluno inativo não aparece nas listagens
- [ ] Boleto gerado com valor proporcional correto
- [ ] E-mail de boleto entrega (ou simula) corretamente

---

## Pós-Deploy

- [ ] **Playwright E2E** — 3 fluxos críticos (ver `TODOS.md`):
  - [ ] Registro público → COORDENADOR aprova → aluno vira ATIVO
  - [ ] Aluno solicita matrícula → aprovada → nota lançada → média calculada
  - [ ] FINANCEIRA acessa `/financeiro`, ALUNO é redirecionado para `/dashboard`
- [ ] Revisão de acessibilidade básica (contraste, labels, navegação por teclado)
- [ ] Paginação nas listagens longas (boletos, matrículas, chamada) — cursor-based

---

## Padrões que todo Sprint deve seguir

### Toda Server Action (obrigatório)
```
1. auth()             → if (!session) return { ok: false, error: 'Não autenticado' }
2. role check         → if (!podeFazerX(role)) return { ok: false, error: 'Sem permissão' }
3. zod validate       → if (!parsed.success) return { ok: false, error: firstIssue }
4. ownership check    → db lookup para IDOR (PROFESSOR vê só suas matérias, ALUNO só seus dados)
5. execute            → prisma operation
```

### Listagens (obrigatório)
- Alunos: `where: { status: { not: 'INATIVO' } }`
- Matrículas: nunca buscar relações dentro de `.map()` — usar `include` na query principal
- Financeiro: `select` apenas os campos necessários (nunca expor `hashedPassword`)

### Imports seguros
- Nunca importar `prisma` em `proxy.ts` (Node.js runtime, mas pelo padrão do projeto)
- Nunca importar `@react-pdf/renderer` em Server Components — sempre `dynamic(..., { ssr: false })`
