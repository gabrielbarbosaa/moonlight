#!/bin/sh
set -eu
cd "$(dirname "$0")"
mkdir -p backups
stamp="$(date +%Y%m%d-%H%M%S)"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "backups/moonlight-$stamp.sql.gz"
docker compose exec -T api tar -C /data/media -czf - . > "backups/media-$stamp.tar.gz"
find backups -name 'moonlight-*.sql.gz' -mtime +14 -delete
find backups -name 'media-*.tar.gz' -mtime +14 -delete
