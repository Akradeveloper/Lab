#!/bin/sh
set -e

# Esperar a que MySQL acepte conexiones (evita P3009 por migración iniciada con BD no lista)
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
echo "Esperando a MySQL en ${DB_HOST}:${DB_PORT}..."
attempt=1
max_attempts=30
while [ "$attempt" -le "$max_attempts" ]; do
  if node -e "
    const net = require('net');
    const s = net.createConnection(${DB_PORT}, '${DB_HOST}', () => { s.destroy(); process.exit(0); });
    s.on('error', () => process.exit(1));
    setTimeout(() => { s.destroy(); process.exit(1); }, 5000);
  " 2>/dev/null; then
    echo "MySQL listo."
    break
  fi
  if [ "$attempt" -eq "$max_attempts" ]; then
    echo "Timeout esperando a MySQL después de ${max_attempts} intentos." >&2
    exit 1
  fi
  echo "Intento $attempt/$max_attempts, reintentando en 2s..."
  sleep 2
  attempt=$((attempt + 1))
done

echo "Aplicando migraciones de Prisma..."
node node_modules/prisma/build/index.js migrate deploy

echo "Arrancando Next.js..."
exec node server.js
