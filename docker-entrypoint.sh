#!/bin/sh
set -e

echo "Aplicando migraciones de Prisma..."
node node_modules/prisma/build/index.js migrate deploy

echo "Arrancando Next.js..."
exec node server.js
