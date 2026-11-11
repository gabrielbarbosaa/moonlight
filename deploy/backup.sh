#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p backups
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "backups/sitebuilder-$(date +%Y%m%d-%H%M%S).sql.gz"
find backups -name 'sitebuilder-*.sql.gz' -mtime +14 -delete
