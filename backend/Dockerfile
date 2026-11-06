# Imagen multi-stage del backend (decisión Docker punto 1 — HANDOFF.md §5).
# Etapa 1: dependencias de producción. Etapa 2: runtime limpio y liviano.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# node solo necesita escribir en /app (crea local.db si no hay TURSO_DATABASE_URL)
RUN chown node:node /app

# OJO: app.js NO hace listen() si NODE_ENV=production (guard serverless de Vercel).
# El contenedor corre con NODE_ENV sin setear para que escuche en :3000.
EXPOSE 3000
USER node
CMD ["node", "app.js"]
