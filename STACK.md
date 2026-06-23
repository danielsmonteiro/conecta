# HealthMatch — Aplicação (backend + frontend)

Aplicação reconstruída a partir dos artefatos recuperados em `recovered-healthmatch/`.

- **backend/** — NestJS + Prisma (PostgreSQL). API REST sob `/api`.
- **frontend/** — Next.js (App Router) + Tailwind v4, fiel ao design recuperado
  (tokens `--hm-*`, sidebar navy, primary `#0b74d1`). Faz proxy de `/api` para o backend.
- **db** — PostgreSQL 16.

## Rodar em desenvolvimento (hot reload)

```bash
docker compose up --build
```

- Frontend: http://localhost:3001
- Backend:  http://localhost:3000/api
- Postgres: localhost:5432

O backend sincroniza o schema (`prisma db push`) e roda o seed automaticamente.
Login padrão (seed): **admin@healthmatch.local** / **changeme123**
(ajustável via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

## Rodar em produção

```bash
# defina segredos reais no ambiente (ou em um .env ao lado do compose)
export POSTGRES_USER=... POSTGRES_PASSWORD=... \
       JWT_ACCESS_SECRET=... JWT_REFRESH_SECRET=... \
       SEED_ON_START=true   # só no primeiro deploy

docker compose -f docker-compose.prod.yml up --build -d
```

- Backend em modo build enxuto (`node dist/src/main.js`), migrações via
  `prisma migrate deploy` (cai para `db push` se ainda não houver migrações).
- Frontend em modo `next start` (output standalone).
- `COOKIE_SECURE=true` por padrão (sirva atrás de HTTPS).

## Arquitetura de autenticação

Cookies httpOnly (`access_token` + `refresh_token`), mesmo modelo da produção
recuperada. O frontend chama `/api/*` (mesma origem, via rewrite do Next), e em
401 o cliente chama `/api/auth/refresh` e repete a requisição.

## Estrutura do frontend

```
frontend/app/
├── layout.tsx          # root (html/body, globals.css)
├── login/page.tsx      # /login
└── (app)/              # route group com o shell autenticado (sidebar + topbar)
    ├── layout.tsx
    ├── page.tsx        # / (dashboard)
    ├── vagas/          # lista, nova, detalhe (matching + financeiro)
    ├── profissionais/  organizacoes/  contratos/
```

> Nota: o painel autenticado fica na raiz (`/`, `/vagas`, …) usando um route group
> `(app)`, em vez de um segmento literal `/app` — isso evita uma colisão de chunks
> do `next dev` com o diretório `app/` do App Router.

## Páginas implementadas

Login, Dashboard (dados reais), Vagas (lista + nova + detalhe com matching/financeiro),
Profissionais, Organizações, Contratos. Os demais itens do menu (Candidaturas,
Matching, Alocações, Escala, Financeiro, Conversas, I.A., Integrações, Auditoria,
Configurações) têm os endpoints prontos no backend — faltam as telas.
