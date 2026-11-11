# Deploy: API na VPS e front na Vercel

Arquitetura:

```
seudominio.com           -> Vercel (Next.js: landing, /admin)
*.seudominio.com         -> Vercel (páginas dos usuários, reescritas pelo middleware)
api.seudominio.com       -> VPS (Caddy -> API NestJS -> Postgres e Redis)
```

O front e a API precisam ficar sob o **mesmo domínio raiz**. Assim o cookie de sessão (host-only na API, `Secure`, `SameSite=Lax`) é enviado nas chamadas do painel.

Na VPS rodam quatro containers: `caddy` (HTTPS automático, únicas portas abertas: 80 e 443), `api`, `postgres` e `redis`. Postgres e Redis não ficam expostos.

## 1. DNS

Crie estes registros no seu provedor de DNS:

| Tipo      | Nome       | Valor                                     |
| --------- | ---------- | ----------------------------------------- |
| A         | `api`      | IP público da VPS                         |
| A / CNAME | raiz e `*` | os valores que a Vercel mostrar (passo 4) |

Os subdomínios dos usuários (`maria.seudominio.com`) exigem um domínio **wildcard** na Vercel, que só funciona usando os nameservers da Vercel para o domínio. Nesse caso, crie o registro `api` dentro do painel de DNS da Vercel. Sem wildcard, as páginas continuam acessíveis por `seudominio.com/s/maria`.

## 2. VPS

Requisitos: Linux com 2 GB de RAM ou mais (o build da imagem usa memória), Docker com o plugin Compose e as portas 80 e 443 liberadas.

```bash
curl -fsSL https://get.docker.com | sh
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
git clone <URL-DO-SEU-REPOSITORIO> moonlight
cd moonlight/deploy
cp .env.production.example .env
chmod 600 .env
```

Edite o `.env`:

- `ROOT_DOMAIN`, `WEB_URL` e `API_DOMAIN` com o seu domínio.
- Senhas e segredos: gere cada um com `openssl rand -hex 32`. A API se recusa a iniciar em produção se `SESSION_SECRET` ou `BILLING_WEBHOOK_SECRET` tiverem menos de 32 caracteres.
- `SMTP_*` com um provedor real. Sem isso ninguém recebe o código de 2FA.
- `SUPERADMIN_EMAILS` com o seu e-mail.

Suba tudo:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f api
```

Na primeira inicialização a API aplica as migrations sozinha (`prisma migrate deploy`). Teste: `https://api.seudominio.com/health` deve responder `{"status":"ok","database":"up"}`.

## 3. Front na Vercel

1. Importe o repositório na Vercel.
2. **Root Directory:** `apps/web`, com "Include source files outside of the Root Directory" ligado. O `apps/web/vercel.json` já define a instalação e o build pela raiz do monorepo.
3. Variáveis de ambiente (Production):

| Variável                  | Valor                        |
| ------------------------- | ---------------------------- |
| `NEXT_PUBLIC_API_URL`     | `https://api.seudominio.com` |
| `API_URL`                 | `https://api.seudominio.com` |
| `ROOT_DOMAIN`             | `seudominio.com`             |
| `NEXT_PUBLIC_ROOT_DOMAIN` | `seudominio.com`             |

As variáveis `NEXT_PUBLIC_*` entram no build: depois de alterá-las, faça um novo deploy.

## 4. Domínios na Vercel

Em Settings > Domains, adicione `seudominio.com` e `*.seudominio.com` e siga as instruções de DNS que a Vercel mostrar.

## Operação

Atualizar a API:

```bash
cd moonlight && git pull && cd deploy && docker compose up -d --build
```

Backup do Postgres e das imagens enviadas (volume `media`; guarda 14 dias em `deploy/backups`), agendado todo dia às 03:00:

```bash
chmod +x backup.sh
(crontab -l 2>/dev/null; echo "0 3 * * * $PWD/backup.sh") | crontab -
```

Restaurar um backup:

```bash
gunzip -c backups/ARQUIVO.sql.gz | docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

Restaurar as imagens:

```bash
docker compose exec -T api tar -C /data/media -xzf - < backups/ARQUIVO-media.tar.gz
```

Copie também os backups para fora da VPS. As imagens ficam no volume `media` da API e são entregues por `https://api.seudominio.com/media/files/...`; garanta que `API_URL` no `deploy/.env` seja esse endereço público.

## Problemas comuns

- **502 ou o Caddy não emite o certificado:** confira se o DNS de `api` aponta para a VPS e se as portas 80 e 443 estão abertas. Veja `docker compose logs caddy`.
- **Erro de CORS no painel:** `WEB_URL` deve ser exatamente a origem do front, com `https://` e sem barra no final.
- **Login não mantém a sessão:** o front e a API precisam estar sob o mesmo domínio raiz.
- **Código de 2FA não chega:** veja `docker compose logs api` e as variáveis `SMTP_*`.
- **Checkout responde 404:** com `BILLING_SANDBOX_ENABLED=false` o checkout simulado fica desligado. O único provedor de pagamento hoje é o sandbox, que não cobra de verdade.
- **Primeiro superadmin:** crie uma conta com o e-mail listado em `SUPERADMIN_EMAILS` e confirme o código de 2FA. O papel é aplicado nessa confirmação.
