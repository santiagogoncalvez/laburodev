# Reglas del proyecto — laburoDev

Bolsa de trabajos para desarrolladores. Frontend (React + Vite) y API (Express 5) desplegadas en Vercel.

## Estructura

- **Paquetes independientes**: `frontend/` y `backend/` son hermanos, sin npm workspaces. Cada uno tiene su `package.json`, su lockfile y su `node_modules`.
- `frontend/` — Vite + React 19 + SWC + Zustand + React Router v7 + Streamdown. Entry: `src/main.jsx` → `src/App.jsx`.
- `backend/` — Express 5 + Zod + Vercel AI SDK (`ai`, `@ai-sdk/google`). Entry: `app.js`. Capas: `routes/` → `controllers/` → `models/` → `db/`.
- **Persistencia**: Turso (libSQL) vía `@libsql/client`. Sin `TURSO_DATABASE_URL` cae a SQLite local (`file:local.db`). `jobs.json` ya no es la fuente de datos de la API: es el dataset de origen del seed.

## Comandos

```bash
# API (desde laburodev/backend/)
npm start              # node app.js, API en :3000
npm run dev            # node --watch app.js
npm test               # node --test (corre TODOS los *.test.js) — ver gotcha abajo
npm run db:seed        # crea esquema + importa jobs.json (correr antes que los tests si la DB está vacía)
npm run db:reset       # dropea la tabla y vuelve a seedear

# Docker (desde laburodev/backend/)
docker build -f Dockerfile.vercel -t laburodev-api . # imagen que usan CI y Vercel (CMD server.js, ENV NODE_ENV=production)
docker run --rm -p 3000:3000 laburodev-api # API en :3000
docker run --rm -p 3000:3000 --env-file .env -e NODE_ENV=production laburodev-api # con Turso/Gemini locales (el -e es obligatorio: ver gotcha)
docker exec <contenedor> npm run db:seed   # seed adentro del contenedor (la DB es efímera sin volume)

# Frontend (desde laburodev/frontend/)
npm run dev            # :5173
npm run build          # build de producción
npm run lint           # eslint . (ver estado abajo)
npm run test:ai        # tests con agente Stagehand (ver abajo)
npx playwright test    # e2e/ — no hay script npm; webServer está comentado en playwright.config.js
```

En PowerShell usar `npm.cmd` si la policy de ejecución bloquea `npm` (falla con `npm.ps1 cannot be loaded`).

## Tests backend — gotchas verificados

- **Siempre correr con `NODE_ENV=test`**: `app.js` hace `listen()` cuando NODE_ENV no es `test`/`production` y el proceso **queda colgado** después de los tests. En PowerShell: `$env:NODE_ENV='test'; npm.cmd test`.
- **Gotcha `NODE_ENV` en contenedores** (clave, verificado): `Dockerfile.vercel` setea `ENV NODE_ENV=production` y arranca `server.js`, que **siempre hace `listen()`** (es el entrypoint para Vercel). Pero `app.js` también escucha si `NODE_ENV` no es `production`/`test`: si corrés con `--env-file .env` y tu `.env` tiene `NODE_ENV=development`, ese valor **pisa** el de la imagen → doble `listen()` → crash `EADDRINUSE`. Solución: `-e NODE_ENV=production` en el `docker run` (el flag CLI gana sobre `--env-file`). En tests nativos pasa al revés: se necesita `NODE_ENV=test` para que `app.js` NO escuche (el test levanta su server en `:3001`).
- La suite depende de datos sembrados (`GET /jobs` espera filas): correr `npm run db:seed` si la DB está recién creada.
- Los tests de IA (suite `[AI]`) llaman a Gemini real con `GOOGLE_GENERATIVE_AI_API_KEY` del `.env`. CI los salta con `node --test --test-skip-pattern="AI"`.
- El server de tests corre en `:3001` (importa `app.js`, que no escucha bajo `NODE_ENV=test`, y lo levanta el `before()` del test).
- `.env` se carga con `process.loadEnvFile()` en `app.js` antes de importar config (sin dotenv). No pisa vars ya existentes en el entorno.

## Frontend

- **La URL manda** el estado de búsqueda y filtros (`useSearchParams`): los efectos solo leen la URL, nunca la escriben; la escritura pasa solo por handlers (`Search.jsx`).
- **Login/register/profile son mock local con Zustand** — no hay backend de auth; no intentar conectarlos.
- Rutas: `/`, `/search`, `/jobs/:jobId`, `/login`, `/register`, `/profile`.
- Diseño: leer `frontend/DESIGN-SYSTEM.md` antes de tocar UI (tokens, Bricolage Grotesque 400/500, lucide-react, cero emoji).
- `npm run lint` **hoy falla de forma preexistente**: `ai-e2e/*.js` y `playwright.config.js` usan `process` pero la config de eslint solo declara globals de browser, más 1 warning en `Detail.jsx`. No es regresión tuya. CI no corre lint (solo build).
- `@swc/core` en Windows: si reinstalar falla con *"Failed to load native binding"* (permisos DACL del perfil), forzar `@swc/core` a `1.13.5` con `overrides` en `frontend/package.json`.

## IA — Resumen de empleos (`/ai/summary/:id`)

Backend:
- Endpoint: `GET /ai/summary/:id` — streaming con Vercel AI SDK + Gemini (respuesta `text/plain`, no SSE).
- Rate limit específico: 5 req/min/IP (`middlewares/rateLimit.js` → `aiRateLimiter`).
- Validación Zod del `id` (UUID) en `routes/ai.js`; 404 devuelve `{ error: "Empleo no encontrado" }`.
- Prompt en `routes/ai.js`: adaptado a la estructura de job (`title`, `company`, `location`, `level`, `technology`, `description`).
- Modelo: `MODEL_AI` en `.env` (default en `config.js`: `gemini-3.5-flash-lite`). Requiere `GOOGLE_GENERATIVE_AI_API_KEY`.

Frontend:
- Hook: `src/hooks/useAISummary.jsx` — fetch streaming con `ReadableStream` + `TextDecoder`.
- Componente: `src/components/AISummary.jsx` — botón generar/regenerar + `Streamdown` para markdown animado.
- Integrado en `src/pages/Detail.jsx` tras el header.

## Rate Limiting

- **Global**: `generalLimiter` (100 req/15 min/IP) aplicado a toda la API en `app.js`.
- **IA específico**: `aiRateLimiter` (5 req/1 min/IP) solo en `/ai/*`.
- Headers estándar `RateLimit`, `RateLimit-Policy` (draft-8).
- `app.set("trust proxy", 1)` para IPs reales detrás de proxy (Vercel).

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

1. `backend-test`: `npm ci` → `npm run db:seed` → `node --test --test-skip-pattern="AI"` con `NODE_ENV: test`.
2. `frontend-build`: `npm ci` → `npm run build`.
3. `backend-smoke-test`: `docker build -f backend/Dockerfile.vercel` (el mismo artefacto que Vercel despliega) → corre la imagen en `:3000` → `curl /health` (si falla, imprime `docker logs` del contenedor).
4. **Deploy solo en push a main** (no en PR), vía Vercel CLI (`vercel pull` + `vercel deploy --prod`) con tokens por proyecto — **no** es deploy de Vercel Git: ambos `vercel.json` tienen `"git": { "deploymentEnabled": false }`.
5. Smoke test post-deploy: `/` en `laburodev.vercel.app`, `/health` en `laburodev-api.santiagogoncalvez.com`.

Dos projects separados, uno por paquete (rootDirectory configurado en cada project de Vercel).

- Frontend: `vercel.json` con rewrite SPA; `VITE_API_URL` en build.
- API: `FRONTEND_URL` en runtime (URLs separadas por coma, tolera slash final) para CORS, más `PORT`.
- Variables de entorno backend: `GOOGLE_GENERATIVE_AI_API_KEY`, `MODEL_AI`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (ver `backend/.env.example`).
