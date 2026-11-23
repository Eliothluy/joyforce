# Contrato de implementação — JoyForce web

Documento de coordenação entre o agente de **backend** e o de **frontend**.
A arquitetura-alvo é a **Opção B′**: um único projeto Next.js (App Router) no
Vercel, API em Route Handlers, Postgres (Neon) e **todo o tempo real no
navegador**. Nada de SSE/WebSocket no servidor.

## Stack e comandos

| Item | Valor |
|---|---|
| Node | 24 |
| Next.js | 15.5 (App Router) |
| React | 19 |
| TypeScript | 5.9, `strict` + `noUncheckedIndexedAccess` |
| Estilo | Tailwind CSS 4 (CSS-first, tokens em `src/app/globals.css`) |
| Validação | `zod` 3 — schemas em `src/lib/domain/contratos.ts` |
| Banco | Postgres 16 (Docker local / Neon em produção) via Prisma 6 |
| Hash de senha | `bcryptjs` |

```bash
npm install
cp .env.example .env
docker compose up -d db      # Postgres local em localhost:5432
npm run db:push              # cria o schema
npm run db:seed              # contas + dados mockados
npm run dev
npm run build                # prisma generate && next build (igual ao Vercel)
```

## Donos de arquivo (evita conflito de escrita)

**Agente BACKEND** escreve apenas em:

```
prisma/schema.prisma
prisma/seed.ts
src/lib/server/**            # prisma client, auth, serviços, consultas
src/app/api/**               # Route Handlers
src/types/**                 # se precisar de tipos auxiliares de servidor
```

**Agente FRONTEND** escreve apenas em:

```
src/app/layout.tsx
src/app/page.tsx
src/app/globals.css          # já existe: pode estender, não trocar os tokens
src/app/login/**
src/app/fisio/**
src/app/sessao/**
src/app/not-found.tsx
src/app/error.tsx
src/components/**
src/lib/device/**
src/lib/api-client.ts
```

**Ninguém edita `package.json`.** Faltou dependência? Reporte; não instale.

**Leitura permitida (não editar):** `src/lib/domain/**` (contratos e constantes
do ERS) é compartilhado; o backend pode importar `src/lib/device/**`
(máquina de estados) só para leitura.

## Convenções de código

- Copy da UI em **pt-BR**; identificadores em **pt-BR** também (`Paciente`,
  `Repeticao`) para casar com o ERS.
- `strict` de verdade: sem `any`, sem `@ts-ignore`, sem `as` para escapar de erro.
- Server Components por padrão; `"use client"` só em formulários, gráfico
  interativo, telas de sessão e componentes com estado.
- Erros de rede/validação nunca viram `throw` silencioso: mostrar mensagem.
- Acessibilidade: `label` em todo campo, `aria-live` no contador, foco visível.
- Datas sempre formatadas com os helpers de `src/lib/domain/constantes.ts`.

## Autenticação

- Cookie `joyforce_sessao`, `httpOnly`, `sameSite=lax`, `path=/`, `secure` em
  produção, validade de 8 h.
- Valor: token aleatório (32 bytes base64url). No banco, grava-se **somente o
  hash SHA-256** do token.
- Toda rota `/api/**` exige sessão, **exceto** `POST /api/auth/login` e
  `GET /api/health`.
- Escopo de dados: cada fisioterapeuta vê **somente os pacientes que criou**
  (`Paciente.criadoPorId`). Acesso a paciente/sessão de outro usuário → **404**
  (não 403, para não vazar existência).
- No servidor, `requireUsuario()` devolve o usuário ou lança/retorna 401 em rotas
  de API. Em páginas, a proteção fica no layout (`redirect('/login')`).

## Envelope de respostas

| Situação | Corpo |
|---|---|
| Recurso único | DTO puro (`PacienteDTO`) |
| Lista | `{ "pacientes": PacienteDTO[] }` |
| Erro | `{ "erro": string, "campos"?: Record<string,string> }` |

Status: `200` ok, `201` criado, `204` sem conteúdo, `400` validação,
`401` sem sessão, `404` inexistente/fora do escopo, `409` conflito de regra.

## Endpoints

### Auth

| Método | Rota | Entrada | Saída | Regras |
|---|---|---|---|---|
| POST | `/api/auth/login` | `LoginInput` | `{ usuario: UsuarioDTO }` + `Set-Cookie` | 401 com `erro: "E-mail ou senha inválidos."` |
| POST | `/api/auth/logout` | — | `204` | apaga a sessão no banco |
| GET | `/api/auth/me` | — | `{ usuario }` | 401 se não houver |
| GET | `/api/health` | — | `{ ok: true }` | público |

### Pacientes

| Método | Rota | Entrada | Saída | Regras |
|---|---|---|---|---|
| GET | `/api/pacientes?q=` | query opcional | `{ pacientes }` | filtra por nome (`contains`, `insensitive`) |
| POST | `/api/pacientes` | `PacienteCreateInput` | `201 PacienteDTO` | valida com zod; erro → 400 com `campos` |
| GET | `/api/pacientes/:id` | — | `PacienteDetalheDTO` | 404 se não for do usuário |
| POST | `/api/pacientes/:id/avaliacoes` | `AvaliacaoCreateInput` | `201 AvaliacaoDTO` | **409** se já existir `INICIAL` para o paciente |

`PacienteDetalheDTO.resumo` é calculado no servidor:

- `totalSessoes`: sessões `CONCLUIDA`.
- `totalRepeticoes`: soma de `totalRepeticoesValidas`.
- `amplitudeMedia`: média de `amplitudeMaxima` das concluídas.
- `repeticoesUltimaSessao`, `variacaoRepeticoes`, `variacaoAmplitude`: última
  concluída contra a média das 3 anteriores (`null` quando não há base).
- `semanasConsecutivas`: semanas ISO consecutivas com ≥1 sessão concluída,
  contando a partir da semana atual ou da anterior.

### Sessões

| Método | Rota | Entrada | Saída | Regras |
|---|---|---|---|---|
| POST | `/api/sessoes` | `{ pacienteId }` | `201 SessaoDetalheDTO` | cria `Sessao` `PREPARANDO` + `Exercicio` padrão. Se já existir sessão `PREPARANDO`/`EM_ANDAMENTO` do paciente → `409` com `{ erro, sessaoId }` |
| GET | `/api/sessoes/:id` | — | `SessaoDetalheDTO` | 404 fora do escopo |
| POST | `/api/sessoes/:id/calibracao` | `CalibracaoCreateInput` | `{ aceita: boolean, sessao: SessaoDTO }` | `aceita = variacaoMax <= 50 && duracaoMs >= 2900`. Aceita → status `EM_ANDAMENTO`, `calibracaoAceita=true` |
| POST | `/api/sessoes/:id/repeticao` | `LoteRepeticoesInput` | `{ aceitas, totalRepeticoesValidas }` | idempotente por `sequencia`; recalcula agregados da sessão na mesma transação |
| PATCH | `/api/sessoes/:id` | `SessaoAcaoInput` | `ResultadoSessaoDTO` (concluir) ou `{ sessao }` (abortar) | `concluir` exige calibração aceita e ≥1 repetição → 409 caso contrário. Gera `Avaliacao` (`INICIAL` se for a primeira, senão `ACOMPANHAMENTO`) com os máximos por direção (frente/trás/esq/dir = `amplitudeMaxima` da sessão) |

`ResultadoSessaoDTO.comparacao` traz a última sessão concluída **anterior** a
esta (reps e amplitude) e a avaliação `INICIAL` do paciente.

`Exercicio` padrão criado junto da sessão: `direcao=FRENTE`,
`zonaNeutraMin=-30`, `zonaNeutraMax=30`, `limiar=120`, `tempoMaxMs=10000`.

## Consultas para Server Components (backend expõe, frontend consome)

Em `src/lib/server/consultas.ts`:

```ts
listarPacientes(usuarioId: string, q?: string): Promise<PacienteListagemDTO[]>
obterPacienteDetalhe(usuarioId: string, pacienteId: string): Promise<PacienteDetalheDTO | null>
obterSessaoDetalhe(usuarioId: string, sessaoId: string): Promise<SessaoDetalheDTO | null>
obterPainel(usuarioId: string): Promise<PainelDTO>   // dashboard e feed do início
obterNomePaciente(usuarioId: string, pacienteId: string): Promise<string | null>
```

`obterPainel` (11/11/2026, estendido em 23/11/2026) alimenta a página inicial `/`
como dashboard clínico e feed de atividades. Tipos em `src/types/painel.ts`.
Deriva **somente** de dados já existentes (sem métrica nova): resumo dos últimos
7 dias (pacientes ativos, sessões concluídas, repetições válidas, amplitude
média e variações vs. 7 dias anteriores), série das últimas 6 semanas ISO,
distribuição de status das sessões, panorama comparativo dos pacientes, sessões
`PREPARANDO`/`EM_ANDAMENTO` (retomáveis), itens de feed (`SESSAO_CONCLUIDA` com
variação vs. anterior, `SESSAO_ABORTADA`, `AVALIACAO_INICIAL` **apenas quando
registrada manualmente**, `PACIENTE_CADASTRADO`) e pacientes sem sessão
concluída há mais de 7 dias. A página `/` renderiza o painel para quem está
autenticado e redireciona para `/login` caso contrário; pós-login vai para `/`.

`listarPacientes` devolve `PacienteListagemDTO[]` (`src/types/listagem.ts`),
superconjunto de `PacienteDTO` com a última sessão concluída, tendência,
contagens de constância e série recente de repetições.

Em `src/lib/server/auth.ts`:

```ts
obterUsuarioAtual(): Promise<UsuarioDTO | null>   // lê o cookie e valida a sessão
criarSessaoAcesso(usuarioId: string): Promise<string> // devolve o token, grava o hash
encerrarSessaoAtual(): Promise<void>
```

Em `src/lib/server/prisma.ts`: `export const prisma` (singleton).

O frontend usa as consultas **apenas em Server Components**; em layouts faz
`const usuario = await obterUsuarioAtual(); if (!usuario) redirect('/login')`.
Em Client Components, usa `src/lib/api-client.ts` (HTTP) para mutações.

## Contas de exemplo (seed)

| E-mail | Senha | Nome |
|---|---|---|
| `ana.ribeiro@joyforce.app` | `joyforce123` | Dra. Ana Ribeiro |
| `bruno.souza@joyforce.app` | `joyforce123` | Dr. Bruno Souza |

Dados mockados (determinísticos, datas relativas a hoje):

- **Ana (5 pacientes)**
  1. Maria das Graças Silva, 1958-03-14, “AVC isquêmico — hemiparesia à direita”, 9133224455 — 8 sessões em 6 semanas, ganho consistente (8 → 22 reps).
  2. João Pereira Lima, 1949-07-02, “Fratura de úmero proximal — pós-cirúrgico”, 9133224466 — 6 sessões, platô em ~10 reps.
  3. Ana Costa Ferreira, 1981-11-23, “Lesão de plexo braquial”, 9133224477 — **sem sessões** (estado vazio / primeira avaliação).
  4. Carlos Mendes Rocha, 1954-01-09, “Artroplastia de ombro”, 9133224488 — 4 sessões, uma `ABORTADA`.
  5. Rita Nascimento Alves, 1967-05-30, “Tendinite crônica de manguito rotador”, 9133224499 — 3 sessões.
- **Bruno (1 paciente)** — Paulo Henrique Souza, 1970-02-18, “Lesão por esforço repetitivo”, 9133224400 — 2 sessões. Serve para provar o isolamento entre contas.

Consistência obrigatória no seed: `totalRepeticoesValidas` = quantidade de
`Repeticao.valida`, `amplitudeMaxima` = máximo de `amplitude`, avaliações
coerentes com a sessão de origem.

## Mapa de páginas (frontend)

| Rota | Conteúdo | Requisito |
|---|---|---|
| `/` | redireciona para `/fisio/pacientes` ou `/login` | — |
| `/login` | form + credenciais de demonstração visíveis | RF-01 “Requer” |
| `/fisio/pacientes` | busca, lista com idade, diagnóstico, última sessão, reps e tendência | RF-01 |
| `/fisio/pacientes/novo` | form de 4 campos com mensagens por campo | RF-01 / HU-01 |
| `/fisio/pacientes/[id]` | ficha: linha de base, gráfico, histórico, botão iniciar sessão | RF-04 / RU-06 |
| `/sessao/[id]/preparar` | conexão (≤3 s) → calibração (3 s, ≤50) → resumo do exercício | RF-02 / RF-03 |
| `/sessao/[id]/executar` | kiosk: contador, zona neutra, tempo da repetição | RF-05 |
| `/sessao/[id]/resultado` | resumo + comparação + bloco amigável ao paciente | RF-04 / HU-03 |

Regra de UI obrigatória: **“Iniciar exercício” só habilita com conexão
confirmada e calibração aceita.** RF-02/RF-03 viram estado, não mensagem de erro.

A tela de execução usa `FakeDevice` por padrão (funciona sem hardware) e oferece
“usar dispositivo real” quando `navigator.serial` existir.
