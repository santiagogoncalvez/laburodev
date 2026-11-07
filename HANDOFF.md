# Contexto y Estado de Desarrollo — laburoDev

Archivo de traspaso entre sesiones. Leer esto al inicio de una sesión nueva para retomar el contexto.
Para comandos, convenciones y gotchas de código, ver `AGENTS.md`.

## 1. Estado Actual

Proyecto dividido en dos paquetes independientes (sin workspaces):

- `frontend/` — Vite + React 19 + SWC + Zustand + React Router v7 + Streamdown.
- `backend/` — Express 5 + Zod + Vercel AI SDK (`ai`, `@ai-sdk/google`). Persistencia en **Turso (libSQL)** vía `@libsql/client`, con fallback a SQLite local (`file:local.db`). `jobs.json` es solo el dataset de origen del seed (`npm run db:seed`).

### Últimas funcionalidades integradas

- **Base de datos Turso**: esquema en `backend/db/schema.sql`, seed/migración de columnas en `backend/db/seed.js`.
- **Resumen de ofertas con IA** (`GET /ai/summary/:id`): streaming con Gemini (`MODEL_AI`, default `gemini-3.5-flash-lite`), en el frontend hook `useAISummary` + componente `AISummary` + `Streamdown`.
- **Rate limiting doble**: `generalLimiter` (100 req/15 min/IP) global + `aiRateLimiter` (5 req/1 min/IP) en `/ai/*`.
- **Tests E2E con Stagehand v4** en `frontend/ai-e2e/`.
- **CI/CD en GitHub Actions** (`.github/workflows/ci.yml`): test + build en PR, deploy a Vercel solo en push a `main` (vía Vercel CLI, no Vercel Git).

## 2. Decisiones Técnicas y Configuración

- Express 5 con ESM (`"type": "module"` en ambos paquetes); imports relativos con `.js`.
- **Autostart del server** en `backend/app.js` protegido por `NODE_ENV`: no hace `listen()` cuando `NODE_ENV` es `production` ni `test` (el test levanta su propio server en `:3001`). Por eso correr los tests siempre con `NODE_ENV=test`, si no el proceso queda colgado.
- Zod valida en **controllers**, no en rutas.
- Frontend: la **URL manda** el estado de búsqueda (`useSearchParams`); nunca escribir params desde efectos.
- Deploy independiente en Vercel por paquete (rootDirectory configurado en cada project de Vercel).
- En Windows, si `npm` falla por policy de ejecución usar `npm.cmd`.
- Si `@swc/core` falla con "Failed to load native binding": forzar `1.13.5` vía `overrides` en `frontend/package.json`.

## 3. Gotchas que costaron ciclos

- **Stagehand v4**: `extract()` devuelve `{ data, metadata }` (desestructurar `data`); el `page` no es un Page de Playwright (sin `waitForURL`/`getByRole`, usar polling con `page.evaluate`); **siempre** `await browser.close()` además de `stagehand.close()`; un `act` por paso (dos instrucciones en un solo `act` solo ejecuta la primera).
- Carpeta con espacios rompe Vercel → carpetas sin espacios.
- Prereq E2E: API en `:3000` + front en `:5173` + `AI_API_KEY` en `frontend/.env`.
- Tests backend: requieren DB sembrada (`npm run db:seed`); la suite `[AI]` llama a Gemini real y CI la salta con `--test-skip-pattern="AI"`.

## 4. Próximos Pasos (Pendientes)

1. ~~Migración de `jobs.json` a base de datos~~ → **hecho** (Turso/libSQL). Pendiente real: evaluar si se necesita PostgreSQL/Turso remoto en producción (hoy puede correr con `local.db`) y definir estrategia de migraciones de esquema.
2. Autenticación / roles para reclutadores (crear/editar ofertas). Hoy login/register/profile son **mock local con Zustand**, sin backend de auth.
3. Ampliar cobertura de tests unitarios en el Backend (hoy: `app.test.js` — CRUD, filtros, paginación, validaciones, IA).
4. ~~Roadmap completo en `../Roadmap.txt`~~ → **el archivo no existe** en esa ruta; recuperar el roadmap original si se necesita (6 etapas: SQL → Node/TS → KIO → libros → arquitectura/calidad → ORM).

## 5. Docker (módulo 13 jscamp) — decisiones

### ✅ Punto 1 — ejecutado (local + CI)

Alcance mínimo cumplido. **No cambió el flujo diario**: seguís desarrollando con `npm run dev` en nativo; Docker es capa de verificación + CI.

1. `backend/Dockerfile` — multi-stage (`deps` → `runner`), `node:24-alpine`, `npm ci --omit=dev`, `chown node:node /app` (para que pueda crear `local.db`), `USER node`, `EXPOSE 3000`, `CMD ["node", "app.js"]`.
2. `backend/.dockerignore` — `.env*` (la API key nunca entra), `node_modules`, `local.db`, logs.
3. Smoke test de CI (`backend-smoke-test`): ahora `docker build` → `docker run -d` → `curl /health`; si falla imprime `docker logs`.

Verificado en local: build OK, `/health` OK, `.env`/`local.db` fuera de la imagen, seed adentro del contenedor OK (58 empleos), `/jobs` OK. Imagen: ~75 MB (content).

Gotchas:
- **`app.js` no hace `listen()` si `NODE_ENV=production`** (guard serverless): el contenedor corre con NODE_ENV sin setear. En tests pasa al revés: se necesita `NODE_ENV=test` para que NO escuche.
- `@libsql/client` en `alpine` (musl): **funcionó sin problema** — no hizo falta caer a `node:24-slim`.
- La `local.db` del contenedor es **efímera**: sin volume, cada `docker run` arranca vacía (hay que seedear). Si algún día se quiere persistencia entre corridas, agregar un volume en el `run`.
- Frontend **no** se dockeriza: Vercel lo sirve desde CDN y el HMR de Vite en contenedor Windows/WSL2 es más lento que el nativo.
- Sin `docker-compose.yml` por ahora: con un solo servicio alcanza `docker run`.

### ✅ Punto 2 — ejecutado (proyecto Vercel nuevo, rama `feat/docker-vercel`)

Deploy dockerizado del backend funcionando y verificado de punta a punta en **`https://laburodev-api-docker.vercel.app`** (proyecto Vercel nuevo `laburodev-api-docker`, Container Runtime de Vercel — Beta en todos los planes incluido Hobby).

**Archivos (commits en `feat/docker-vercel`):**
1. `backend/server.js` — entrypoint nuevo: importa `app` de `app.js` y **siempre** hace `listen()`. `app.js` **no se tocó** (su guard serverless sigue intacto para el deploy serverless tradicional).
2. `backend/Dockerfile.vercel` — multi-stage idéntico al `Dockerfile` + `ENV NODE_ENV=production` (desactiva el guard de `app.js`, evitando doble `listen()`) + `CMD ["node", "server.js"]`.

**Configuración del proyecto nuevo (vía CLI, `backend/.vercel` linkeado):**
- Env vars: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `GOOGLE_GENERATIVE_AI_API_KEY` (Secret), `MODEL_AI`, `FRONTEND_URL=https://laburodev.santiagogoncalvez.com` (Config — **el origen real del frontend**, verificado contra el API viejo).
- `framework=container` forzado con `vercel project update`.
- `PORT` **no hizo falta setearlo**: Vercel respetó el `EXPOSE 3000` del Dockerfile.
- Vercel inyecta `NODE_ENV=production` en producción (el guard de `app.js` se salta igual).

**Verificado en el deploy (5/5):** `/health` · `/jobs` con datos reales de Turso (`createdAt 2026-10-26` ≠ el `local.db` local) · streaming IA (`text/plain`, TTFB 1,05s vs total 2,11s) · headers `RateLimit` en el contenedor · CORS con el dominio custom.

Gotchas:
- **Tu `.env` local tiene `NODE_ENV=development`**: al correr el contenedor con `--env-file .env` hay que agregar `-e NODE_ENV=production` (el flag CLI pisa al env-file) o `app.js` también escucha → crash `EADDRINUSE`.
- El seed se hace igual: `docker exec <contenedor> npm run db:seed` (sin TURSO en el `.env`, cae a `local.db` efímera).
- La suite local (32/32) pasó con el refactor de services incluido antes del redeploy.
- CI (`backend-smoke-test`) ahora construye **`Dockerfile.vercel`** (el artefacto real que Vercel despliega).

### ⏳ Pendiente del punto 2 — corte a producción

El proyecto serverless viejo (`laburodev-api.santiagogoncalvez.com`) sigue sirviendo producción. Falta:
1. **Corte del dominio**: quitar `laburodev-api.santiagogoncalvez.com` del proyecto viejo → adjuntarlo al nuevo `laburodev-api-docker` (el frontend no cambia: su `VITE_API_URL` ya apunta al dominio custom).
2. **CI `deploy-backend`**: apuntar al proyecto nuevo (project ID/token) una vez migrado el dominio.
3. Decidir destino del `backend/Dockerfile` viejo (hoy sin uso en CI/Vercel; candidato a eliminar para tener un solo Dockerfile) y borrar/retirar el proyecto serverless una vez validado el corte.

## 6. Estado de git al momento de escribir esto

- Rama **`feat/docker-vercel`** (pusheada a `origin`): punto 2 de Docker (`server.js` + `Dockerfile.vercel`), CI usando `Dockerfile.vercel`, refactor de services (`JobService`) y documentación de esta sesión.
- `main` sigue con el pipeline serverless de siempre (deploy al proyecto viejo `laburodev-api`).
- Pendiente: merge de `feat/docker-vercel` → `main` (dispara CI completo) y el corte de dominio descrito en §5.
