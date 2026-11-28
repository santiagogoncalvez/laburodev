# Reglas del proyecto — laburoDev

Bolsa de trabajos para desarrolladores. Frontend (React + Vite) y API (Express 5) desplegadas en Vercel.

## Regla de Oro para Agentes
Toda la documentación, planes de trabajo, notas de arquitectura y entregables deben crearse **estrictamente dentro de la carpeta raíz del proyecto (`C:\Users\music\Documents\Programacion\fullstack-projects\laburodev`)**. NO usar directorios externos para archivos relacionados con el desarrollo o la planificación.

## Flujo de trabajo — ramas y deploys (obligatorio)

- **Siempre se trabaja en `development`**: los commits van a esa rama y el push a `origin/development` despliega preview (`laburodev-dev.vercel.app` + `laburodev-api-dev.vercel.app`). Referencia completa: `FLUJO-TRABAJO.md`.
- **`main` / producción NO se toca por cuenta propia**: solo cuando Santiago lo dice explícitamente, después de probar en desarrollo local y en preview remoto. Recién ahí se mergea `development` → `main` y se pushea.

## Estructura

- **Paquetes independientes**: `frontend/` y `backend/` son hermanos, sin npm workspaces. Cada uno tiene su `package.json`, su lockfile y su `node_modules`.
- `frontend/` — Vite + React 19 + SWC + Zustand + React Router v7 + Streamdown. Entry: `src/main.tsx` → `src/App.tsx`. **100% TypeScript** (`npm run typecheck` = `tsc -b`, también corre en CI vía `build`).
- `backend/` — Express 5 + **TypeScript** + Zod + Vercel AI SDK (`ai`, `@ai-sdk/google`). Entry: `app.ts` (`npm run build` → `dist/`). Capas: `routes/` → `controllers/` → `services/` → `models/` → `db/`.
- **Persistencia**: Turso (libSQL) vía `@libsql/client`. Sin `TURSO_DATABASE_URL` cae a SQLite local (`file:local.db`). `jobs.json` ya no es la fuente de datos de la API: es el dataset de origen del seed. Credenciales de prod en `backend/.env` con sufijo `_PROD` (`TURSO_DATABASE_URL_PROD` / `TURSO_AUTH_TOKEN_PROD`): nunca se cargan solas; re-seedear prod con `npm run db:seed:prod`.
- **Migraciones (T-004)**: el esquema se migra **automáticamente antes de cada deploy** (`db:migrate:dev` en preview, `db:migrate:prod` en producción). Es aditivo e idempotente: agrega columnas/índices, nunca borra datos; si falla, el deploy no se ejecuta. `db:seed` / `db:reset` siguen siendo **manuales** (contra prod, solo si Santiago lo pide expresamente). Cambios destructivos de esquema: en dev se aplican a mano; en prod requieren script planeado con respaldo. `--schema-only --reset` se rechaza con error.

## Comandos

```bash
# API (desde laburodev/backend/)
npm start              # node dist/app.js (requiere npm run build antes)
npm run dev            # tsx watch app.ts (recarga en vivo)
npm run build          # tsc → dist/
npm run typecheck      # tsc --noEmit (chequeo sin emitir)
npm run lint           # biome check . (Biome — config única en biome.json de la raíz)
npm test               # node --import tsx --test (corre TODOS los *.test.js; tsx resuelve los .ts) — ver gotcha abajo
npm run db:seed        # tsx db/seed.ts — crea esquema + importa jobs.json (correr antes que los tests si la DB está vacía)
npm run db:reset       # dropea la tabla y vuelve a seedear
npm run db:seed:prod   # seed contra Turso PROD — inyecta TURSO_*_PROD del .env como TURSO_* antes de correr el seed
npm run db:migrate     # migrate local: solo esquema/columnas/índices (sin DELETE, sin DROP, sin jobs.json)
npm run db:migrate:dev # migrate contra Turso DEV (inyecta TURSO_*_DEV) — corre en CI antes del deploy de preview
npm run db:migrate:prod # migrate contra Turso PROD — corre en CI antes del deploy; nunca seed/reset automático en prod

# Docker (desde laburodev/backend/)
docker build -f Dockerfile.vercel -t laburodev-api . # imagen que usan CI y Vercel (build tsc + CMD node dist/server.js, ENV NODE_ENV=production)
docker run --rm -p 3000:3000 laburodev-api # API en :3000
docker run --rm -p 3000:3000 --env-file .env -e NODE_ENV=production laburodev-api # con Turso/Gemini locales (el -e es obligatorio: ver gotcha)
docker exec <contenedor> npm run db:seed   # seed adentro del contenedor (la DB es efímera sin volume)

# Frontend (desde laburodev/frontend/)
npm run dev            # :5173
npm run build          # build de producción
npm run lint           # biome check . (Biome — config única en biome.json de la raíz)
npm run test:ai        # tests con agente Stagehand (ver abajo)
npx playwright test    # e2e/ — no hay script npm; webServer está comentado en playwright.config.js
```

En PowerShell usar `npm.cmd` si la policy de ejecución bloquea `npm` (falla con `npm.ps1 cannot be loaded`).

## Tests backend — gotchas verificados

- **Siempre correr con `NODE_ENV=test`**: `app.ts` hace `listen()` cuando NODE_ENV no es `test`/`production` y el proceso **queda colgado** después de los tests. En PowerShell: `$env:NODE_ENV='test'; npm.cmd test`.
- **Gotcha `NODE_ENV` en contenedores** (clave, verificado): `Dockerfile.vercel` setea `ENV NODE_ENV=production` y arranca `dist/server.js`, que **siempre hace `listen()`** (es el entrypoint para Vercel). Pero `app.ts` también escucha si `NODE_ENV` no es `production`/`test`: si corrés con `--env-file .env` y tu `.env` tiene `NODE_ENV=development`, ese valor **pisa** el de la imagen → doble `listen()` → crash `EADDRINUSE`. Solución: `-e NODE_ENV=production` en el `docker run` (el flag CLI gana sobre `--env-file`). En tests nativos pasa al revés: se necesita `NODE_ENV=test` para que `app.ts` NO escuche (el test levanta su server en `:3001`).
- La suite depende de datos sembrados (`GET /jobs` espera filas): correr `npm run db:seed` si la DB está recién creada.
- **Suite en serie**: `npm test` usa `--test-concurrency=1`. Los archivos de test comparten `local.db`; en paralelo se bloqueaban por locks de SQLite y el run colgaba.
- `favorites.test.js` (puerto 3002) usa el usuario fijo `favoritos-test@laburodev.dev` y lo limpia en `before`/`after` (idempotente).
- Los tests de IA (suite `[AI]`) llaman a Gemini real con `GOOGLE_GENERATIVE_AI_API_KEY` del `.env`. CI los salta con `npm test -- --test-skip-pattern="AI"`.
- El server de tests corre en `:3001` (importa `app.ts`, que no escucha bajo `NODE_ENV=test`, y lo levanta el `before()` del test).
- `.env` se carga con `process.loadEnvFile()` en `app.ts` antes de importar config (sin dotenv). No pisa vars ya existentes en el entorno.
- **Imports con extensión `.js`**: los archivos `.ts` importan con specificador `.js` (convención TS/NodeNext) — `tsc` y `tsx` resuelven `./x.js` → `x.ts`. No cambiarlo a `.ts` en los imports.

## Frontend

- **La URL manda** el estado de búsqueda y filtros (`useSearchParams`): los efectos solo leen la URL, nunca la escriben; la escritura pasa solo por handlers (`Search.jsx`).
- **Auth real con Better Auth (Fase 1)**: cliente en `src/lib/auth-client.ts`, sesión con `useSession`, favoritos sincronizados con el server (ver sección "Auth"). El mock `authStore` fue eliminado.
- Rutas: `/`, `/search`, `/jobs/:jobId`, `/login`, `/register`, `/profile`.
- Diseño: leer `frontend/DESIGN-SYSTEM.md` antes de tocar UI (tokens, Bricolage Grotesque 400/500, lucide-react, cero emoji).
- **Lint con Biome 2.6** (config única en `biome.json` de la raíz; ESLint fue reemplazado): cubre `frontend/src/**` y `backend/**/*.ts` (los `.js` de `ai-e2e/` y configs quedan fuera de scope). Convenciones: frontend comillas simples, backend comillas dobles (override en config), indent de 2 espacios, orden de imports activo (`assist`). `npm run lint` funciona desde la raíz (chequea todo el repo, 67 archivos) o desde frontend/backend (scope del paquete, resuelve el binario de la raíz). `typescript-eslint` no se usa porque TS7 todavía no expone API programática (typescript-eslint#10940). CI corre lint en el job `lint` (gate de ambos deploys).
- `@swc/core` en Windows: si reinstalar falla con *"Failed to load native binding"* (permisos DACL del perfil), forzar `@swc/core` a `1.13.5` con `overrides` en `frontend/package.json`.

## IA — Resumen de empleos (`/ai/summary/:id`)

Backend:
- Endpoint: `GET /ai/summary/:id` — streaming con Vercel AI SDK + Gemini (respuesta `text/plain`, no SSE).
- Rate limit específico: 5 req/min/IP (`middlewares/rateLimit.ts` → `aiRateLimiter`).
- Validación Zod del `id` (UUID) en `routes/ai.ts`; 404 devuelve `{ error: "Empleo no encontrado" }`.
- Prompt en `routes/ai.ts`: adaptado a la estructura de job (`title`, `company`, `location`, `level`, `technology`, `description`).
- Modelo: `MODEL_AI` en `.env` (default en `config.ts`: `gemini-3.5-flash-lite`). Requiere `GOOGLE_GENERATIVE_AI_API_KEY`.

Frontend:
- Hook: `src/hooks/useAISummary.jsx` — fetch streaming con `ReadableStream` + `TextDecoder`.
- Componente: `src/components/AISummary.jsx` — botón generar/regenerar + `Streamdown` para markdown animado.
- Integrado en `src/pages/Detail.jsx` tras el header.

## Rate Limiting

- **Global**: `generalLimiter` (100 req/15 min/IP) aplicado a toda la API en `app.ts`.
- **IA específico**: `aiRateLimiter` (5 req/1 min/IP) solo en `/ai/*`.
- Headers estándar `RateLimit`, `RateLimit-Policy` (draft-8).
- `app.set("trust proxy", 1)` para IPs reales detrás de proxy (Vercel).
- **Store en memoria** (limitación conocida): los contadores son por instancia. Si el contenedor escala a N réplicas, el límite efectivo es N×100. Cuando haya más de una instancia, mover a un store compartido (p. ej. Upstash/Redis + `rate-limit-redis`).

## Escritura de empleos — por sesión + rol + ownership (Etapas B y C)

- `POST/PUT/PATCH/DELETE /jobs` (y el alias same-origin `/api/jobs`) requieren **sesión válida** (401 sin sesión), **rol `recruiter`** (403 "Se necesita rol recruiter para publicar empleos") y verificación de **ownership** en el service (`JobService.checkOwnership`: 404 si no existe, 403 si `job.user_id` no coincide — incluye los empleos del seed con `user_id NULL`, de solo lectura). El rol se chequea **antes** del ownership; `candidate` no puede escribir aunque sea dueño.
- `x-api-key` fue **removido de las rutas** en la Etapa B: `middlewares/writeGuard.ts` queda archivado y sin montar. La Etapa C **no lo reactivó**: el control es rol + sesión + ownership. `WRITE_API_KEY` ya no se lee en rutas (se puede retirar de Vercel cuando Santiago quiera; no bloquea nada).
- GET (`/jobs`, `/jobs/:id`, `/health`, `/ai/*`) sigue abierto sin sesión.
- **Columna**: `jobs.user_id TEXT NULL` (sin FK; la asigna solo el server en `POST`). Migración idempotente en `db/seed.ts`.
- **Rol (Etapa C)**: `"user"."role" TEXT NOT NULL DEFAULT 'candidate'`, declarado también como `additionalFields` en `auth.ts` (transform: cualquier valor raro → `candidate`). La migra el mismo `--schema-only` de T-004; sin backfill ni seed en prod.

## Auth — Better Auth (Fase 1)

Email+password sin verificación de email (fuera de alcance) y con dos roles desde la Etapa C (`candidate` por defecto, `recruiter` opt-in). Misma DB que el CRUD (Turso/SQLite) vía Kysely + `@libsql/kysely-libsql` compartiendo `dbConfig` de `db/index.ts`.

- **Backend**: `auth.ts` (config: `emailAndPassword.enabled`, `trustedOrigins` = allow-list de CORS). En `app.ts`: `app.all("/api/auth/*splat", toNodeHandler(auth))` montado **antes** de `express.json()` (Better Auth lee el body del stream crudo; Express 5 usa `*splat`).
- **Rutas protegidas**: `/api/favorites` (GET/POST/DELETE) y escrituras de `/api/jobs` (POST/PUT/PATCH/DELETE — ownership en el service; ver sección anterior). `middlewares/session.ts` expone `getSessionIdentity(req) → { userId, role } | null` (una sola consulta; la usan las escrituras), además de `getSessionUserId` y `getSessionUserRole`. Cada handler responde 401 si es null. No hay middleware con `req.userId` (evita tipos que mienten).
- **Esquema**: `db/schema.sql` incluye `user`, `session`, `account`, `verification` (salidos de `getMigrations()` de Better Auth — camelCase y entre comillas; NO regenerar a mano sin correr better-auth, el runtime valida las columnas) + `favorites (id, user_id, job_id, created_at, UNIQUE(user_id, job_id))`. El seed normal (`db:seed` / `db:seed:prod`) los crea con `IF NOT EXISTS`.
- **Env**: `BETTER_AUTH_SECRET` (con `NODE_ENV=production` falta → lanza error al arrancar) y `BETTER_AUTH_URL`. **Vercel: agregar ambas** antes del deploy (en CI se usa un dummy).
- **Frontend (mismo origen — obligatorio por cookies)**: Vite proxy `/api` → `:3000` en dev; `vercel.json` rewrite `/api/:path*` → API **primero** en la lista. Jobs/IA siguen con `API_URL` absoluta + CORS (sin credentials).
- **Favoritos**: `favoritesStore` sigue en localStorage (clave `laburodev-favorites`) + flag `loggedIn`. `useFavoritesSync` (llamado en `App.tsx`) hace **merge local ∪ servidor** al iniciar sesión y sube los del invitado; el toggle empuja al server solo con sesión (optimista, el merge corrige). Al cerrar sesión se limpia el local.
- **Perfil**: muestra datos reales de la sesión (incluye el rol); las secciones demo (experiencia/habilidades) se quitaron. Un `candidate` ve el botón "Quiero publicar empleos" (subida de ida vía `update-user`, sin downgrade ni admin). El registro tiene una casilla opcional para elegir `recruiter` desde el alta; `UserMenu` y las rutas `/jobs/new` y `/jobs/:jobId/edit` solo habilitan publicación para `recruiter` (`requiredRole` en `ProtectedRoute`, porque `role` choca con ARIA).

## Tests con agente (`frontend/ai-e2e/`)

Prereq: API en `:3000` + front en `:5173` + `AI_API_KEY` en `frontend/.env` (gitignoreado; también lee `ai-e2e/.env`). Variables: `AI_MODEL` (default `google/gemini-3.1-flash-lite`), `AI_FRONTEND_URL` (default `http://localhost:5173`).

`npm run test:ai` corre solo `test-laburodev.js` (`test-ai.js` y `test-home.js` no están enganchados a ningún script).

Gotchas de Stagehand v4:

- `Stagehand.create({ browser, model })` + `localBrowser.launch()`. No existe `agent()`.
- `extract()` devuelve `{ data, metadata }`: desestructurar `data`.
- El `page` **no** es un Page de Playwright: no tiene `waitForURL` ni `getByRole`. Usar `page.evaluate(condicion)` con polling propio (ver el helper `esperar()` en `frontend/ai-e2e/test-laburodev.js`).
- **Siempre** `await browser.close()` además de `stagehand.close()`: si no, el proceso queda colgado y no termina.
- Un `act` con dos instrucciones hace solo la primera (tipea y no aprieta el botón): un `act` por paso.
- Las instrucciones tienen que ser literales; con ambigüedad el modelo devuelve el dato equivocado.

## CI y Deploy (Vercel)

`.github/workflows/ci.yml` en push/PR a `main`:

1. `lint`: `npm ci` en la raíz → `npm run lint` (Biome sobre todo el repo). Gate de los dos deploys vía `needs`.
2. `backend-test`: `npm ci` → `npm run db:seed` → `npm run typecheck` → `npm test -- --test-skip-pattern="AI"` con `NODE_ENV: test`.
3. `frontend-build`: `npm ci` → `npm run build`.
4. `backend-smoke-test`: `docker build -f backend/Dockerfile.vercel` (el mismo artefacto que Vercel despliega) → corre la imagen en `:3000` → `curl /health` (si falla, imprime `docker logs` del contenedor).
5. **Deploy solo en push a main** (no en PR), vía Vercel CLI (`vercel pull` + `vercel deploy --prod`) con tokens por proyecto — **no** es deploy de Vercel Git: ambos `vercel.json` tienen `"git": { "deploymentEnabled": false }`.
6. Smoke test post-deploy: `/` en `laburodev.vercel.app`, `/health` en `laburodev-api.santiagogoncalvez.com`.

Dos projects separados, uno por paquete (rootDirectory configurado en cada project de Vercel).

- Frontend: `vercel.json` con rewrites de las 6 rutas conocidas (rutas desconocidas → `404.html` con status 404 real: copia del shell de la SPA que genera un plugin en `vite.config.js`); `VITE_API_URL` en build.
- API: `FRONTEND_URL` en runtime (URLs separadas por coma, tolera slash final) para CORS, más `PORT`.
- Variables de entorno backend: `GOOGLE_GENERATIVE_AI_API_KEY`, `MODEL_AI`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (ver `backend/.env.example`).

## Flujo de tickets SDD (Spec-Driven Development) — piloto

Framework [sena-sdd](https://github.com/niic0o/sena-sdd) en piloto (rama `spike/sena-sdd`). **Opt-in**: solo se activa cuando se le pide procesar un ticket; el flujo normal de desarrollo no cambia.

- **Estructura**: `.ai/` (coordinador + 5 workers), `tickets/todo/` (bandeja de entrada), `memory/` (expedientes por ticket).
- **Para procesar un ticket**: crear `tickets/todo/T-###-kebab-case.md` (copiar de `tickets/todo/_template.md`), luego en **Modo Plan**: *"Procesa el ticket tickets/todo/T-###.md siguiendo .ai/coordinador.md"*. Revisar/aprobar el contrato en `memory/`, luego en **Modo Build**: *"Aprobado. Ejecuta el pipeline de memory/T-###.md hasta el cierre del Reviewer"*.
- **Reglas**: los workers respetan `.ai/arquitectura.md`; el reviewer sugiere el commit pero **solo Santiago ejecuta `git commit`/`git push`**; `main` intocable.
- El `05-reviewer` pausa antes de auditar preguntando si querés cambiar de modelo (anti-sesgo).

## Cambios directos (`planes/`)

Para cambios chicos y bien definidos que **no** necesitan el flujo SDD: crear un plan en `planes/` con la estructura de `planes/README.md` (contexto → qué cambiar → qué NO hacer → casos borde → cómo verificar) y pasarle la ruta al agente (*"Aplicá `planes/<nombre>.md`"*). Las features nuevas o complejas siguen por tickets SDD (`tickets/todo/`, T-###). Mismas reglas de git: solo Santiago ejecuta `git commit`/`git push`.
