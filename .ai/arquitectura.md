# ARQUITECTURA Y PROTOCOLOS DEL PROYECTO

## COMANDOS Y RUTAS DEL PROYECTO (VARIABLES PARA WORKERS)
- **Monorepo:** Dos paquetes independientes (sin workspaces): `backend/` y `frontend/`, cada uno con su `package.json`, lockfile y `node_modules`.
- **Ruta de Código Fuente Backend:** `backend/` (entry `app.ts`; capas `routes/` → `controllers/` → `services/` → `models/` → `db/`)
- **Ruta de Código Fuente Frontend:** `frontend/src/` (entry `src/main.tsx` → `src/App.tsx`)
- **Ruta de Pruebas Backend:** `backend/` junto al código (`*.test.js` — se ejecutan con `node --test` vía tsx)
- **Ruta de Pruebas Frontend (E2E):** `frontend/e2e/` (Playwright) y `frontend/ai-e2e/` (Stagehand)
- **Comando de Compilación / Chequeo de Tipos:** Backend: `npm run typecheck` (`tsc --noEmit`) · Frontend: `npm run build` (incluye `tsc -b`)
- **Comando de Ejecución de Tests:** Backend: `$env:NODE_ENV='test'; npm.cmd test` (obligatorio `NODE_ENV=test`; suite en serie, requiere `npm run db:seed` previo) · Frontend E2E: `npx playwright test` (desde `frontend/`)
- **Comando de Linter:** `npm run lint` (Biome — config única en `biome.json` de la raíz)
- **Sistema Operativo / Shell:** Windows PowerShell 5.1 (usar `npm.cmd` si el policy bloquea `npm`)
- **Comando validación entorno:** `npm run typecheck && npm run lint && npm test` (backend, con `NODE_ENV=test`)

## 1. STACK TECNOLÓGICO (CONFIGURABLE POR PROYECTO)
- **Lenguaje & Runtime:** Node.js + TypeScript estricto (backend 100% TS; frontend 100% TS)
- **Framework Backend:** Express 5 + Zod (validación) + Vercel AI SDK (`ai`, `@ai-sdk/google` para Gemini)
- **Framework Frontend:** React 19 + Vite + SWC + Zustand + React Router v7 + Streamdown
- **Base de Datos & ORM:** Turso (libSQL) vía `@libsql/client` + Kysely (`@libsql/kysely-libsql` para Better Auth). Fallback a SQLite local (`file:local.db`) sin `TURSO_DATABASE_URL`. `jobs.json` es el dataset de origen del seed, no la fuente de datos de la API.
- **Auth:** Better Auth (email+password, sin roles — Fase 1)
- **Validación:** Zod
- **Testing:** `node --test` + tsx (backend), Playwright + Stagehand (frontend E2E)
- **Deploy:** Vercel (dos projects: frontend y API), CI en GitHub Actions

## 2. ARQUITECTURA DE CAPAS Y RESPONSABILIDADES
- **Flujo unidireccional Backend:** `Routes → Controllers → Services (Lógica de Negocio) → Models → db/ (Datos) → Turso/SQLite`.
- **Flujo Frontend:** `Pages → Components → Hooks → Stores (Zustand) → Lib/API`.
- **Aislamiento:** Prohibido escribir consultas de base de datos en Controladores o lógica de negocio en componentes visuales.

## 3. REGLAS DE CLEAN CODE Y SEGURIDAD
- Prohibido el uso de `any`, `@ts-ignore`, código comentado o `console.log` olvidados.
- Funciones pequeñas (máximo 30 líneas), una sola responsabilidad (SRP) y retorno temprano (*Early Returns*).
- Manejo de errores centralizado. Prohibido filtrar stack traces o datos sensibles en respuestas HTTP.
- Comandos de tests con `--test-skip-pattern="AI"` en CI (no llamar Gemini sin clave).
- Lint con Biome 2.6 (convención: frontend comillas simples, backend comillas dobles).

## 4. PROTOCOLOS DE EJECUCIÓN BASADOS EN `memory/`
- **Regla de Oro SDD:** El `04-implementador` tiene prohibido tocar código si la **Sección 2 (Contrato Técnico y Plan de Archivos)** dentro de `memory/[ticket].md` no está completa.
- **Protocolo de FEATURE:** Requiere diseño de contrato en `memory/[ticket].md` por el `02-arquitecto` y tests en rojo por el `03-tester` antes de codificar.
- **Protocolo de BUGFIX:** Requiere diagnóstico en `memory/[ticket].md` por el `01-investigador` y un test de regresión que reproduzca el bug antes de aplicar el fix.
- **Protocolo de PERFORMANCE / REFACTOR:** Requiere diagnóstico previo del `01-investigador`. Prohibido optimizar a ciegas o romper tests existentes.
- **Protocolo de UI / CHORE:** El Coordinador completa la Sección 1 y 2 de `memory/[ticket].md` y delega al `04-implementador` y `05-reviewer`.

## 5. GUARDRAILS GLOBALES
- Prohibido ejecutar `git commit`, `git push` o borrar migraciones. **Solo Santiago ejecuta el commit final.**
- Prohibido instalar paquetes nuevos sin permiso explícito del usuario.
- **Rama:** El flujo de trabajo laburoDev es `development` (push a `origin/development` despliega preview). **`main` / producción NO se toca.** Referencia: `FLUJO-TRABAJO.md`.
- **Imports backend:** usar especificador `.js` en imports de archivos `.ts` (convención TS/NodeNext) — `tsc` y `tsx` resuelven `./x.js` → `x.ts`.
- **Tests:** suite backend en serie (`--test-concurrency=1`), comparten `local.db`; correr siempre con `NODE_ENV=test`.

## 6. VALIDACIÓN DE ENTORNO (OBLIGATORIA AL INICIAR)
El `01-investigador` (modo onboarding) o el Coordinador DEBEN ejecutar el **Comando validación entorno** antes de procesar el primer ticket. Si falla:
1. Registrar error en `.ai/state.md`
2. Detener ejecución y alertar al usuario
3. No continuar hasta que el entorno compile y testee en verde