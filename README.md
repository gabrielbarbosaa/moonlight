# Moonlight

Plataforma multi-tenant para criar páginas pessoais a partir de blocos (header, hero, links, texto, footer), com painel administrativo, analytics e, mais adiante, agenda como módulo opcional.

Projeto de estudo e portfólio, pensado para rodar **100% local e sem custo**.

## Stack

| Parte                     | Tecnologia                                                     |
| ------------------------- | -------------------------------------------------------------- |
| Front                     | Next.js 15, TypeScript, TanStack Query, React Hook Form, Axios |
| API                       | NestJS, Prisma                                                 |
| Validação                 | Zod (schemas compartilhados em `packages/schemas`)             |
| Banco                     | PostgreSQL 17                                                  |
| Cache, filas e contadores | Redis                                                          |
| E-mail (dev)              | Mailpit                                                        |
| Imagens                   | Upload com sharp (WebP), disco local atrás de uma interface    |
| Monorepo                  | pnpm workspaces + Turborepo                                    |

## Estrutura

```
apps/
  web/          Next.js: landing, /admin e páginas públicas dos tenants
  api/          NestJS + Prisma
packages/
  schemas/      Schemas Zod compartilhados (auth, tenant, blocos)
docker-compose.yml
```

## Como rodar

Requisitos: Node 20+, pnpm 9+ e Docker.

```bash
cp .env.example .env
pnpm install
pnpm infra:up                 # Postgres, Redis e Mailpit
pnpm db:migrate               # aplica as migrations
pnpm dev                      # compila os pacotes e sobe web em :3000 e api em :4000
```

Endereços úteis:

- Web: http://localhost:3000
- Painel: http://localhost:3000/admin
- Página de um tenant: http://maria.localhost:3000 (subdomínios `*.localhost` funcionam direto no navegador) ou http://localhost:3000/s/maria (fallback por caminho)
- API (health): http://localhost:4000/health
- Mailpit (e-mails do 2FA): http://localhost:8026
- Imagens enviadas: gravadas em `apps/api/storage/media` e servidas em http://localhost:4000/media/files/...

## Deploy

A API roda numa VPS com Docker (Caddy, API, Postgres e Redis) e o front na Vercel. O passo a passo, as variáveis e a operação (atualização, backup) estão em [`deploy/README.md`](deploy/README.md).

## Qualidade sem CI

Não há pipeline na nuvem por enquanto. A verificação é local:

- **Husky + lint-staged**: formata os arquivos alterados a cada commit.
- **commitlint**: exige Conventional Commits (`feat:`, `fix:`, `docs:`...).
- **pre-push**: roda `typecheck` e `test` antes de enviar.
- **`pnpm verify`**: roda lint, typecheck, testes e build de tudo, com cache do Turborepo.

## Decisões de arquitetura (ADRs a escrever)

- Resolução de tenant por subdomínio, com fallback por caminho (`/s/[tenant]`).
- Cookie de sessão **host-only** no domínio principal, para que páginas dos tenants nunca recebam a sessão do painel.
- Páginas em JSONB com `schemaVersion`, validadas pelo mesmo schema Zod no front e no back.
- Prisma como ORM, com SQL cru nas migrations para recursos que ele não modela (por exemplo, exclusion constraints com `tstzrange` na agenda).
- E-mail, armazenamento e cobrança atrás de interfaces, para trocar o adaptador sem mexer no domínio.

## Roadmap

1. Auth com 2FA por e-mail (argon2id, código com hash, expiração e limite de tentativas)
2. Tenants e slugs
3. Motor de blocos e renderer compartilhado
4. Editor com rascunho, publicação e preview
5. Analytics (Redis + agregação diária)
6. Backoffice do superadmin e moderação
7. Agenda como módulo opcional
8. Planos e entitlements (billing em sandbox)
