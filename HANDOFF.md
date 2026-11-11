# Contexto y Estado de Desarrollo — laburoDev

Archivo de traspaso entre sesiones. Leer esto al inicio de una sesión nueva para retomar el contexto.
Para comandos, convenciones y gotchas de código, ver `AGENTS.md`.

## 1. Estado Actual

Proyecto dividido en dos paquetes independientes (sin workspaces):

- `frontend/` — Vite + React 19 + SWC + Zustand + React Router v7 + Streamdown.
- `backend/` — Express 5 + Zod + Vercel AI SDK (`ai`, `@ai-sdk/google`). Persistencia en **Turso (libSQL)** vía `@libsql/client`, con fallback a SQLite local (`file:local.db`). `jobs.json` es solo el dataset de origen del seed (`npm run db:seed`).

### Últimas funcionalidades integradas

- **Base de datos Turso**: esquema en `backend/db/schema.sql`, seed/migración de columnas en `backend/db/seed.ts`.
- **Resumen de ofertas con IA** (`GET /ai/summary/:id`): streaming con Gemini (`MODEL_AI`, default `gemini-3.5-flash-lite`), en el frontend hook `useAISummary` + componente `AISummary` + `Streamdown`.
- **Rate limiting doble**: `generalLimiter` (100 req/15 min/IP) global + `aiRateLimiter` (5 req/1 min/IP) en `/ai/*`.
- **Tests E2E con Stagehand v4** en `frontend/ai-e2e/`.
- **CI/CD en GitHub Actions** (`.github/workflows/ci.yml`): test + build en PR, deploy a Vercel solo en push a `main` (vía Vercel CLI, no Vercel Git).
- **Hardening backend (2026-11-09)**: guard de escritura `x-api-key` (`WRITE_API_KEY`, fail-closed), helmet, `.env` cargado por orden ESM (`env.ts`), bug `total=0` con filtros corregido, `npm audit` 8 → 6 (ver §7).

## 2. Decisiones Técnicas y Configuración

- Express 5 con ESM (`"type": "module"` en ambos paquetes); imports relativos con `.js`. **En backend (TS)**: convención NodeNext — los `.ts` importan con specificador `.js` (`./x.js` resuelve a `x.ts` en `tsc`/`tsx`); no cambiarlo a `.ts`.
- **Backend en TypeScript** (migración 2026-11-09): todo el código fuente es `.ts` (los tests siguen `.js`). `npm run typecheck` (`tsc --noEmit`) tiene que quedar limpio; `npm test` corre con `node --import tsx --test`.
- **Autostart del server** en `backend/app.ts` protegido por `NODE_ENV`: no hace `listen()` cuando `NODE_ENV` es `production` ni `test` (el test levanta su propio server en `:3001`). Por eso correr los tests siempre con `NODE_ENV=test`, si no el proceso queda colgado.
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
2. **PRIORIDAD SIGUIENTE: Autenticación / roles para reclutadores** (crear/editar ofertas). Hoy login/register/profile son **mock local con Zustand**, sin backend de auth. Mientras tanto los escritos ya están protegidos con el guard temporal `x-api-key` (§7): al implementar auth real, reemplazar el guard y setear/retirar `WRITE_API_KEY` en Vercel (decisión de Santiago: sin ella las escrituras responden 503 — el frontend no escribe, cero impacto).
3. Ampliar cobertura de tests unitarios en el Backend (hoy: `app.test.js` — CRUD, filtros, paginación, validaciones, IA, guard).
4. ~~Roadmap completo en `../Roadmap.txt`~~ → **el archivo no existe** en esa ruta; recuperar el roadmap original si se necesita (6 etapas: SQL → Node/TS → KIO → libros → arquitectura/calidad → ORM).
5. ~~Migración a TypeScript del backend~~ → **hecho** (2026-11-09, ver §7).
6. ~~Revisión experta + hardening del backend~~ → **hecho** (2026-11-09, `c09c132`, ver §7).
7. ~~Corte de dominio + borrado del proyecto Vercel viejo `laburodev-api`~~ → **hecho**: el dominio `laburodev-api.santiagogoncalvez.com` ya sirve desde el proyecto nuevo `laburodev-api-docker` (verificado con helmet + guard en prod) y el proyecto viejo fue borrado por Santiago (2026-11-09).
8. ~~**Migración del frontend a TypeScript**~~ → **hecho** (Grupos A–D, 2026-11-11; detalle en `frontend/PLAN-TYPESCRIPT.md`): `src/` 100% `.ts`/`.tsx` (sin `.jsx` residuales), contratos en `frontend/src/types/api.ts`, `npm run typecheck` (`tsc -b`) limpio y corriendo en CI vía `build`. **Decisión de contratos** (sigue vigente): cada paquete es dueño de su contrato — sin imports cruzados a `backend/` (el puente rompió el CI #26); futuro posible: monorepo `packages/shared`. Pendiente de estabilización en `frontend/PENDING_FIXES.md` (streams sin abort, updater impuro, `responsibilities` vacío — fix de datos en backend/seed —, labels de Register, 404 real/`og:` de SPA).

## 5. Docker (módulo 13 jscamp) — decisiones

### ✅ Punto 1 — ejecutado (local + CI)

Alcance mínimo cumplido. **No cambió el flujo diario**: seguís desarrollando con `npm run dev` en nativo; Docker es capa de verificación + CI.

1. `backend/Dockerfile` — multi-stage (`deps` → `runner`), `node:24-alpine`, `npm ci --omit=dev`, `chown node:node /app` (para que pueda crear `local.db`), `USER node`, `EXPOSE 3000`, `CMD ["node", "app.js"]`. *(Este archivo fue **reemplazado por `Dockerfile.vercel`** y eliminado para tener un solo Dockerfile — ver punto 2.)*
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
2. `backend/Dockerfile.vercel` — multi-stage heredado del `Dockerfile` original (**ya eliminado** — es el único Dockerfile del repo) + `ENV NODE_ENV=production` (desactiva el guard de `app.js`, evitando doble `listen()`) + `CMD ["node", "server.js"]`.

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

Estado de los pasos del corte (2026-11-07):

1. ✅ **Secret del CI**: `VERCEL_PROJECT_ID_BACKEND` en GitHub Actions → `prj_ldbALFDM1jK66HeSGuMN1zQ9pzDb` (`laburodev-api-docker`). Token sin cambios (mismo equipo; el job "Validar token" avisa con mensaje claro si fallara).
2. ✅ **`rootDirectory=backend`** seteado en `laburodev-api-docker` (paridad con el proyecto viejo; sin él, el deploy del CI desde la raíz del repo no encontraría `backend/Dockerfile.vercel`). **Gotcha**: con este setting, los deploys manuales por CLI deben hacerse desde la **raíz del repo** (con `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`), nunca desde `backend/` (path doble `backend/backend`).
3. ✅ **Deploy de prueba desde la raíz del repo** → READY (mimic exacto del job `deploy-backend` del CI).
4. ✅ **Corte del dominio — hecho**: `laburodev-api.santiagogoncalvez.com` sirve desde el proyecto nuevo `laburodev-api-docker` (verificado el 2026-11-09 con los headers de helmet y el guard activos en el dominio custom).
5. ✅ **Proyecto serverless viejo `laburodev-api` borrado por Santiago (2026-11-09)**. (Opcional pendiente: apuntar `VITE_API_URL` al dominio custom en vez de la URL del proyecto.)

## 6. Estado de git al momento de escribir esto

- Rama `main` con el **PR #1 mergeado** (`feat/docker-vercel` → `main`): `server.js` + `Dockerfile.vercel`, CI sobre `Dockerfile.vercel`, refactor `JobService`, Dockerfile legacy eliminado, docs.
- `VITE_API_URL` del proyecto Vercel `laburodev` → `https://laburodev-api-docker.vercel.app`: **la producción ya consume la API Docker** (local fue probado y revertido a `localhost:3000`).
- Este push dispara el pipeline completo en `main` (tests + smoke + **deploy al proyecto docker** con el secret ya cambiado).
- ~~Pendiente único: **corte de dominio** (§5.4)~~ → hecho y proyecto viejo borrado (2026-11-09, §5.4–5.5).

## 7. Migración a TypeScript (2026-11-09)

Backend migrado completo a TypeScript según `backend/PLAN-TYPESCRIPT.md` (checklist actualizado con el estado real):

- **Fuentes**: los 13 archivos de `backend/` son `.ts` (renombrados con `git mv`); `types/index.ts` define `Job`, `JobData`, `JobContent`, `PaginatedJobsResponse`, `GetAllParams`; los tipos de entrada salen de `z.infer` en `schemas/jobs.ts`.
- **Scripts**: `dev` → `tsx watch app.ts`, `test` → `node --import tsx --test` (los tests siguen siendo `app.test.js`), `db:seed`/`db:reset` → `tsx db/seed.ts`, `build` → `tsc` (`dist/`), `typecheck` → `tsc --noEmit`.
- **CI**: `backend-test` ahora corre `npm run typecheck` y `npm test -- --test-skip-pattern="AI"` (el `node --test` viejo no sabía cargar `.ts`).
- **Docker**: `Dockerfile.vercel` multi-stage nuevo — stage `build` (`npm ci` + `npm run build`) y stage `runner` con fuente completa + `dist/` fresco (`CMD ["node", "dist/server.js"]`). Verificado local: build ✓, `/health` ✓, seed adentro del contenedor ✓, `/jobs` con filtro ✓. Imagen ~435 MB (antes ~75 MB: ahora incluye devDeps para que `docker exec … npm run db:seed` siga funcionando con tsx).
- **Cambios de comportamiento** (2, ambos intencionales): `maxTokens: 300` → `maxOutputTokens: 300` en `routes/ai.ts` (AI SDK v5 lo renombró; el límite antes se ignoraba en silencio y ahora sí aplica) y la rama muerta `parseResult.error.errors` eliminada (Zod v4 la quitó; caía siempre al fallback `.issues`, comportamiento idéntico).
- **Verificación final**: `typecheck` 0 errores · tests 32/32 · `build` OK · seed OK · imagen Docker OK.
- Docs actualizados: `AGENTS.md` (comandos/gotchas/CI) y este archivo.

### Revisión experta + hardening (2026-11-09, `c09c132`)

Revisión multi-skill sobre `app.ts` y las capas; 6 parches aprobados por Santiago, aplicados y verificados uno por uno:

1. **`total=0` con filtros** (bug preexistente, no de la migración): el COUNT usaba `params.slice(0, -2)` y borraba los filtros → ahora recibe todos + test de regresión. Producción: `?technology=react` devuelve `total=11` (antes 0).
2. **Info disclosure**: el `detail` con mensaje interno del SDK salía en el 500 de `/ai/summary` → ahora solo en el log del server.
3. **`.env` por orden ESM**: nuevo `backend/env.ts` como primer import de `app.ts` y `db/seed.ts` (antes `loadEnvFile()` corría después de que `config.ts`/`cors.ts` leían `process.env` en el top de sus módulos — en local se perdían `MODEL_AI` y `FRONTEND_URL` en silencio).
4. **Cero `as`/`any`/`!` en producción**: error handler con `unknown` + guard `isInvalidJson`, `single()` con `typeof` en controllers (un `?text=a&text=b` ahora se ignora en vez de reventar), `mapRow` con `asString`/`parseJsonArray` sin cast, guard de `body` antes de flush en el stream de IA.
5. **`npm audit fix`** (sin `--force`): 8 → 6 vulnerabilidades (body-parser high + qs moderate resueltos; queda la cadena `@fastify/busboy` — no alcanzable sin multipart, requiere major de ai-sdk).
6. **Helmet + guard de escritura**: `helmet()` en `app.ts`; `middlewares/writeGuard.ts` exige header `x-api-key` = env `WRITE_API_KEY` en `POST/PUT/PATCH/DELETE /jobs` (comparación timing-safe, **fail-closed**: sin la env var responden 503). 4 tests nuevos del guard; docs en `AGENTS.md` (nueva sección "Escritura protegida" + nota del store en memoria del rate limit) y `.env.example`.

Estado: `typecheck` 0 · **37/37 tests** · `build` OK · smoke de `dist/app.js` OK · CI #24 verde (5 jobs) · prod verificada (helmet + `total=11` + guard 503). `WRITE_API_KEY` **pendiente en Vercel** hasta que exista auth real (decisión de Santiago). Proyecto Vercel viejo `laburodev-api` **borrado** por Santiago (2026-11-09). La key local vive en `backend/.env` (gitignoreado; ver `.env.example`).
