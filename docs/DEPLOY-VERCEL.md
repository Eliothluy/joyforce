# Deploy do JoyForce web no Vercel

O app é um monólito Next.js (App Router): UI e API no mesmo projeto. O Vercel
detecta o framework sozinho — **nenhuma configuração de build além das
variáveis de ambiente**.

## 1. Banco de dados (Neon, uma vez)

1. Crie uma conta gratuita em [neon.tech](https://neon.tech) e um projeto
   (região preferencialmente `aws/us-east-1`, a mais próxima dos servidores do
   Vercel nos EUA).
2. Copie a **connection string *pooled*** (termina em
   `?sslmode=require&pgbouncer=true`) — é ela que vai para o Vercel.
3. Ainda em local, aponte o `.env` para o Neon **uma vez** para criar o schema
   e popular os dados de demonstração:

   ```bash
   # .env com a string do Neon
   npm run db:push   # cria as tabelas
   npm run db:seed   # contas de exemplo + pacientes mockados
   ```

   Depois volte o `.env` para o Postgres local (`docker compose up -d db`).

## 2. Importar o projeto no Vercel

1. Faça push do repositório para o GitHub e, em
   [vercel.com/new](https://vercel.com/new), importe `Eliothluy/joyforce`.
2. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | connection string *pooled* do Neon (passo 1) |
   | `AUTH_SECRET` | segredo aleatório de 32+ caracteres (`openssl rand -base64 32`) |

3. Deploy. O comando de build já está em `package.json`
   (`prisma generate && next build`) — o Vercel o executa sem ajustes.

## 3. Pós-deploy

- Acesse a URL do Vercel e entre com as contas de demonstração
  (`ana.ribeiro@joyforce.app` / `joyforce123`).
- Para recomeçar os dados de demonstração **do zero**, rode `npm run db:reset`
  com o `DATABASE_URL` apontando para o banco alvo (local ou Neon).
- Cada deploy novo **não** apaga dados: o banco vive no Neon, não no Vercel.

## 4. Manutenção

- Trocas de schema: edite `prisma/schema.prisma`, rode `npm run db:push` no
  banco alvo e faça deploy. Sem migrations automáticas no Vercel.
- Segredos nunca vão para o git: `.env` está no `.gitignore`; use apenas o
  `.env.example` como modelo.
- O cookie de sessão vira `secure` automaticamente em produção
  (`NODE_ENV=production` no Vercel).
