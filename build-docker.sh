#!/bin/sh
# Construir la imagen qalab-app leyendo variables de .env.docker
set -e

# Cargar variables de .env.docker (ignorar comentarios y lineas vacias)
if [ -f .env.docker ]; then
  export $(grep -v '^\s*#' .env.docker | grep -v '^\s*$' | xargs)
fi

echo "Construyendo imagen qalab-app..."
docker build \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY}" \
  -t qalab-app .

echo "Imagen qalab-app construida correctamente."
