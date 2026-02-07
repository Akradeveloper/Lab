# ---- Stage 1: Instalar dependencias ----
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: Build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# URL ficticia solo para que prisma generate y next build compilen
ENV DATABASE_URL=mysql://build:build@localhost:3306/build

# Variables NEXT_PUBLIC_* se inyectan en build time (no en runtime)
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Generar cliente Prisma y compilar Next.js (standalone)
RUN npx prisma generate && npm run build

# ---- Stage 3: Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar output standalone de Next.js
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copiar Prisma (schema, migraciones, config) para poder hacer migrate deploy en el entrypoint
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/src/lib/database-url.ts ./src/lib/database-url.ts

# Copiar node_modules completos (Prisma CLI tiene muchas deps transitivas)
COPY --from=build /app/node_modules ./node_modules

# Script de arranque (sed elimina \r de finales de linea Windows CRLF)
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
