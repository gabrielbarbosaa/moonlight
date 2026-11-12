#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  echo "O arquivo .env já existe. Apague-o (rm .env) se quiser gerar de novo."
  exit 1
fi

read -rp "Seu domínio, sem https:// (ex: meusite.com.br): " DOMAIN
read -rp "Seu e-mail (vira superadmin do backoffice): " ADMIN

if [ -z "$DOMAIN" ] || [ -z "$ADMIN" ]; then
  echo "Domínio e e-mail são obrigatórios."
  exit 1
fi

cp .env.production.example .env
chmod 600 .env

sed -i "s/seudominio\.com/$DOMAIN/g" .env
sed -i "s|^SUPERADMIN_EMAILS=.*|SUPERADMIN_EMAILS=$ADMIN|" .env

for key in POSTGRES_PASSWORD REDIS_PASSWORD SESSION_SECRET BILLING_WEBHOOK_SECRET; do
  sed -i "s|^$key=.*|$key=$(openssl rand -hex 32)|" .env
done

cp moonlight.caddy.example moonlight.caddy
sed -i "s/seudominio\.com/$DOMAIN/g" moonlight.caddy

echo
echo ".env criado com domínio, segredos e senhas gerados."
echo "Também criei moonlight.caddy, o trecho que vai para o proxy da VPS."
echo "Falta só configurar o e-mail (SMTP_*). Edite com: nano .env"
