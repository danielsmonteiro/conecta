#!/bin/sh
set -e

echo "[entrypoint] Sincronizando schema com o banco..."
# Usa migrações se existirem; senão sincroniza o schema direto (primeiro boot).
if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  npx prisma db push --accept-data-loss --skip-generate
fi

if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] Rodando seed..."
  node node_modules/.bin/tsx prisma/seed.ts || node dist/prisma/seed.js || echo "[entrypoint] seed pulado"
fi

echo "[entrypoint] Iniciando: $*"
exec "$@"
