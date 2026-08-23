# ⚙️ Setup & Ambiente de Desenvolvimento

Guia completo para configurar o ambiente de desenvolvimento do KPICorp com monorepo Turborepo, frontend em Vite + React e backend em NestJS.

---

# 🧱 Stack Resumida

## Frontend

- **Framework:** Vite + React 19
- **Linguagem:** TypeScript
- **Roteamento:** TanStack Router
- **Estilização:** Tailwind CSS v4
- **Componentes:** shadcn/ui + Radix UI
- **Estado global:** Zustand
- **Cache/Server State:** TanStack Query v5
- **Formulários:** React Hook Form + Zod
- **Animações:** Motion (Framer Motion v11)
- **Ícones:** Phosphor Icons
- **Testes:** Vitest + Testing Library + Playwright

## Backend

- **Runtime:** Node.js 24
- **Framework:** NestJS
- **Linguagem:** TypeScript
- **ORM:** Prisma v6
- **Validação:** Zod + class-validator
- **Auth:** JWT (jose) + bcrypt
- **Docs:** Swagger (OpenAPI via @nestjs/swagger)
- **Storage:** Supabase Storage
- **E-mail:** Resend
- **Testes:** Vitest + Supertest

## Banco de Dados

- **Principal:** PostgreSQL 16 via Docker (local)
- **Cache:** Redis via Docker (local)

## Infra & Tooling

- **Monorepo:** Turborepo
- **Package manager:** npm
- **Lint:** ESLint + Prettier
- **Git hooks:** Husky + lint-staged
- **CI/CD:** GitHub Actions
- **Monitoramento:** Sentry
- **Logs:** Axiom

---

# 📋 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado na máquina:

- **Node.js 24** — nodejs.org (npm já vem incluído)
- **Git** — git-scm.com
- **Docker Desktop** — obrigatório para rodar PostgreSQL e Redis localmente — docker.com
- **VS Code** (recomendado) com as extensões listadas abaixo

### Extensões recomendadas no VS Code

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- GitLens
- Error Lens
- Docker

---

# 🐳 Docker — Banco de Dados Local

Crie o arquivo `docker-compose.yml` na raiz do projeto:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: kpicorp_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: kpicorp
      POSTGRES_PASSWORD: kpicorp
      POSTGRES_DB: kpicorp
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: kpicorp_redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Comandos Docker

```bash
# Subir os containers (PostgreSQL + Redis)
docker compose up -d

# Verificar se estão rodando
docker compose ps

# Parar os containers
docker compose down

# Parar e remover os volumes (limpa os dados)
docker compose down -v

# Ver logs do banco
docker compose logs postgres
```

Após subir os containers, o banco estará acessível em:

- **PostgreSQL:** `localhost:5432`
- **Redis:** `localhost:6379`

---

# 🗂️ Estrutura do Monorepo

```
kpicorp/
├── apps/
│   ├── web/                  # Frontend — Vite + React
│   └── api/                  # Backend — NestJS
├── packages/
│   ├── ui/                   # Shared components (shadcn/ui base)
│   ├── types/                # Shared TypeScript types
│   ├── zod-schemas/          # Shared Zod schemas (validation)
│   └── tsconfig/             # Base TypeScript configs
├── .github/
│   └── workflows/            # GitHub Actions
├── docker-compose.yml        # Local database setup
├── turbo.json                # Turborepo config
└── package.json              # Root package
```

---

# 🚀 Passo a Passo: Criando o Monorepo do Zero

## 1. Criar o repositório

```bash
mkdir kpicorp && cd kpicorp
git init
```

## 2. Criar o `package.json` na raiz

```json
{
  "name": "kpicorp",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "db:up": "docker compose up -d",
    "db:down": "docker compose down"
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "^3.0.0",
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=24"
  }
}
```

## 3. Instalar o Turborepo

```bash
npm install
```

Crie o `turbo.json` na raiz:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

---

# 🎨 Setup do Frontend (apps/web)

## 4. Criar o app Vite + React

```bash
mkdir -p apps/web && cd apps/web
npm create vite . --template react-ts
```

## 5. Instalar dependências do frontend

```bash
npm install @tanstack/react-router @tanstack/react-query
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install motion
npm install @phosphor-icons/react
npm install -D tailwindcss @tailwindcss/vite
npm install -D @types/node
```

## 6. Configurar Tailwind CSS v4

No `vite.config.ts`:

```tsx
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': '/src' }
  }
})
```

No `src/index.css`:

```css
@import "tailwindcss";
```

## 7. Configurar TanStack Router

```bash
npm install -D @tanstack/router-plugin
```

Atualizar `vite.config.ts`:

```tsx
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

plugins: [
  TanStackRouterVite(),
  react(),
  tailwindcss(),
]
```

Criar a estrutura de rotas em `src/routes/`:

```
src/routes/
├── __root.tsx         # Root layout
├── index.tsx          # Route / (redirect to login or dashboard)
├── login.tsx          # Route /login
├── dashboard.tsx      # Route /dashboard
├── ranking.tsx        # Route /ranking
├── profile.tsx        # Route /profile
└── admin/
    ├── index.tsx      # Route /admin
    ├── kpis.tsx       # Route /admin/kpis
    ├── members.tsx    # Route /admin/members
    └── meeting.tsx    # Route /admin/meeting
```

---

# 🔧 Setup do Backend (apps/api)

## 8. Criar o app NestJS

```bash
cd ../../
npx @nestjs/cli new apps/api --package-manager npm --skip-git
```

## 9. Instalar dependências do backend

```bash
cd apps/api
npm install @nestjs/config @nestjs/jwt @nestjs/swagger
npm install @prisma/client bcrypt zod class-validator class-transformer
npm install resend
npm install -D prisma @types/bcrypt
```

## 10. Configurar Prisma

```bash
npx prisma init
```

Estrutura do `prisma/schema.prisma`:

```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role     @default(MEMBER)
  position     String?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())

  assignedKpis KpiAssignment[] @relation("AssignedTo")
  assignedByMe KpiAssignment[] @relation("AssignedBy")
  meetings     MeetingAttendee[]
}

model Kpi {
  id          String      @id @default(cuid())
  name        String      @unique
  description String?
  points      Int
  category    KpiCategory
  active      Boolean     @default(true)
  createdAt   DateTime    @default(now())

  assignments KpiAssignment[]
}

model KpiAssignment {
  id         String   @id @default(cuid())
  kpiId      String
  userId     String
  assignedBy String
  note       String?
  active     Boolean  @default(true)
  assignedAt DateTime @default(now())

  kpi       Kpi      @relation(fields: [kpiId], references: [id])
  user      User     @relation("AssignedTo", fields: [userId], references: [id])
  assigner  User     @relation("AssignedBy", fields: [assignedBy], references: [id])
  meeting   Meeting? @relation(fields: [meetingId], references: [id])
  meetingId String?
}

model Meeting {
  id        String   @id @default(cuid())
  title     String
  date      DateTime
  closed    Boolean  @default(false)
  createdBy String
  createdAt DateTime @default(now())

  attendees   MeetingAttendee[]
  assignments KpiAssignment[]
}

model MeetingAttendee {
  id        String @id @default(cuid())
  meetingId String
  userId    String

  meeting Meeting @relation(fields: [meetingId], references: [id])
  user    User    @relation(fields: [userId], references: [id])
}

enum Role {
  ADMIN
  MEMBER
}

enum KpiCategory {
  ATTENDANCE
  PERFORMANCE
  BEHAVIOR
}
```

## 11. Configurar Swagger

No `src/main.ts`:

```tsx
import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')
  app.enableCors()

  const config = new DocumentBuilder()
    .setTitle('KPICorp API')
    .setDescription('API documentation for KPICorp system')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  await app.listen(3333)
  console.log('🚀 API running at http://localhost:3333')
  console.log('📖 Docs at http://localhost:3333/docs')
}

bootstrap()
```

---

# 📦 Setup dos Packages Compartilhados

## 12. Criar o package de tipos compartilhados

```bash
mkdir -p packages/types && cd packages/types
```

Criar `package.json`:

```json
{
  "name": "@kpicorp/types",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

## 13. Criar o package de schemas Zod

```bash
mkdir -p packages/zod-schemas && cd packages/zod-schemas
```

Criar `package.json`:

```json
{
  "name": "@kpicorp/zod-schemas",
  "version": "0.0.1",
  "main": "./src/index.ts",
  "dependencies": {
    "zod": "^3.22.0"
  }
}
```

---

# 🌍 Variáveis de Ambiente

## 14. Configurar .env

Criar `.env` em `apps/api/`:

```bash
# Database — Docker local
DATABASE_URL="postgresql://kpicorp:kpicorp@localhost:5432/kpicorp"

# Redis — Docker local
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-here-minimum-32-chars"
JWT_EXPIRES_IN="7d"

# App
PORT=3333
NODE_ENV=development

# Resend (emails)
RESEND_API_KEY="re_xxxx"
RESEND_FROM="noreply@kpicorp.com"

# Frontend URL (invite links)
FRONTEND_URL="http://localhost:5173"
```

Criar `.env` em `apps/web/`:

```bash
VITE_API_URL="http://localhost:3333/api"
```

Adicionar ao `.gitignore`:

```bash
.env
.env.local
.env.production
node_modules
```

---

# 🎣 Configurar Git Hooks

## 15. Husky + lint-staged

```bash
# Na raiz do monorepo
npm install -D husky lint-staged
npx husky init
```

Editar `.husky/pre-commit`:

```bash
npx lint-staged
```

No `package.json` da raiz, adicionar:

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "*.{json,md,yaml}": [
    "prettier --write"
  ]
}
```

---

# ▶️ Rodando o Projeto

## 16. Subir os containers Docker

```bash
# Na raiz — sobe PostgreSQL e Redis
npm run db:up
```

## 17. Instalar todas as dependências

```bash
# Na raiz do monorepo
npm install
```

## 18. Rodar as migrations do banco

```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

## 19. Rodar tudo em paralelo (dev)

```bash
# Na raiz do monorepo — sobe frontend e backend juntos
npm run dev
```

Isso vai rodar:

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3333
- **Swagger Docs:** http://localhost:3333/docs

---

# ✅ Checklist de Setup

- [ ]  Node.js 24 instalado
- [ ]  Docker Desktop instalado e rodando
- [ ]  Repositório criado e inicializado
- [ ]  `docker-compose.yml` criado
- [ ]  `npm run db:up` executado — PostgreSQL e Redis rodando
- [ ]  npm workspaces configurado
- [ ]  Turborepo instalado e configurado
- [ ]  App web criado (Vite + React)
- [ ]  Tailwind CSS v4 configurado
- [ ]  TanStack Router configurado
- [ ]  App api criado (NestJS)
- [ ]  Prisma inicializado com schema completo
- [ ]  Migration inicial executada (`prisma migrate dev`)
- [ ]  Swagger configurado
- [ ]  Packages compartilhados criados
- [ ]  Variáveis de ambiente configuradas
- [ ]  Husky + lint-staged configurados
- [ ]  `npm run dev` rodando sem erros
- [ ]  Swagger acessível em localhost:3333/docs

---

> 💡 **Tip:** After the setup, the first development task is **[Auth & Access] User Login**. With the environment ready and Prisma schema running, you can already create the auth module in NestJS and the login screen in the frontend.
>