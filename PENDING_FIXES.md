# Bitácora de Fixes Pendientes — laburoDev

Este archivo centraliza todos los problemas de **LÓGICA** (no de tipado) detectados durante el desarrollo y migración a TypeScript. Deben ser resueltos durante las fases de estabilización según el `ROADMAP.md`.

---

## 🔴 Alta Prioridad (Bugs de Datos / Accesibilidad / Crashes)

### 1. [Backend/Seed] Responsabilidades y Requisitos vacíos en `/jobs/:id`
- **Origen**: `frontend/PENDING_FIXES.md` (Grupo C).
- **Problema**: `jobs.json` guarda `responsibilities`/`requirements` como strings de Markdown, pero `seed.ts` los guarda como JSON-string y `models/jobs.ts#parseJsonArray` espera JSON-array. Esto hace que la API sirva arrays vacíos `[]` en todas las filas.
- **Fix futuro**: Actualizar el seed en `backend/db/seed.ts` para que divida el markdown por saltos de línea (`\n`) en un array real, o ajustar `parseJsonArray` en el modelo para interpretar strings como arrays de una línea.
- **✅ Resuelto** (2026-11-11, `097cd8e`): `parseJsonArray` ahora acepta JSON-string → `[string]` (las filas viejas se sirven **sin re-seed**) y `seed.ts` envuelve con `toArray()` al sembrar. El frontend conserva `join("\n")`.

### 2. [Frontend / Detail] Fetch de detalle sin abort y continúa tras `!ok`
- **Origen**: `frontend/PENDING_FIXES.md` (Grupo C).
- **Problema**: `Detail.tsx` no usa `AbortController`. Si el usuario cambia de `jobId` rápidamente, la respuesta vieja puede pisar la nueva. Además, al recibir `!ok` ejecuta `navigate("/not-found")` pero **sigue ejecutando** `setJob(json)` con el body de error.
- **Fix futuro**: Implementar `AbortController` + flag `cancelled` en el `useEffect` de `Detail.tsx` y cortar la ejecución con `return` / `throw` en lugar de continuar tras `!ok`.
- **✅ Resuelto** (2026-11-11, `a9fa9cc`): async/await + `AbortController` con flag de cancelación; `return` en `!ok` (sin parsear el body de error); deps `[jobId, navigate]`.

### 3. [Frontend / Register] Labels con `htmlFor` huérfanas
- **Origen**: `frontend/PENDING_FIXES.md` (Grupo C).
- **Problema**: `Register.tsx` usa `<label htmlFor="name">` y `htmlFor="password">`, pero los `<input>` tienen `id={nameId}` / `id={passwordId}` generados por `useId()`. El click en el label no enfoca el input (accesibilidad).
- **Fix futuro**: Pasar `htmlFor={nameId}` y `htmlFor={passwordId}` en `Register.tsx`.
- **✅ Resuelto** (2026-11-11, `57b87c4`): `htmlFor={nameId}` / `htmlFor={passwordId}` aplicados.

---

## 🟡 Media Prioridad (Concurrencia / Memory Leaks / Resilience)

### 4. [Frontend / useAISummary] Stream sin cancelación (`AbortController`)
- **Origen**: `frontend/PENDING_FIXES.md` (Grupo B).
- **Problema**: El fetch del stream en `useAISummary.ts` no usa `AbortController` ni cleanup al desmontar. Si el componente se desmonta mientras el stream está activo, el loop `reader.read()` sigue llamando a `setSummary`.
- **Fix futuro**: Guardar `AbortController` en un `ref`, llamar a `controller.abort()` en la función de limpieza del `useEffect` y reiniciar el estado al cambiar `jobId`.
- **✅ Resuelto** (2026-11-11, `a9fa9cc`): `controllerRef` + abort en cleanup del `useEffect [jobId]`, reinicio de `summary`/`error`/`loading` al cambiar de `jobId`.

### 5. [Frontend / useAISummary] Updater impuro en `setSummary` (`firstChunk`)
- **Origen**: `frontend/PENDING_FIXES.md` (Grupo B).
- **Problema**: La variable `firstChunk` se muta dentro del updater de `setSummary`. Si React StrictMode invoca el updater dos veces, la concatenación se duplica.
- **Fix futuro**: Mover la lógica de "reemplazo vs append" fuera del updater usando un `ref` booleano.
- **✅ Resuelto** (2026-11-11, `a9fa9cc`): el flag vive en `firstChunkRef` y el updater recibe `isFirstChunk` ya calculado (updater puro).

### 6. [Frontend / useAISummary] Sin guard de concurrencia en `generateSummary`
- **Origen**: `frontend/PENDING_FIXES.md` (Grupo B).
- **Problema**: Hacer dos clicks rápidos en "Generar" dispara dos streams paralelos escribiendo al mismo estado `summary`, mezclando el contenido de ambos resúmenes.
- **Fix futuro**: Ignorar llamadas si `loading` ya es `true` o abortar el stream previo antes de arrancar uno nuevo.
- **✅ Resuelto** (2026-11-11, `a9fa9cc`): al invocar se aborta el stream anterior (`controllerRef`) y se arranca uno nuevo.

---

## 🟢 Baja Prioridad (SEO / Infrastructure)

### 7. [Frontend / SEO] SPA sin status HTTP 404 real ni meta `og:` en servidor
- **Origen**: `frontend/PENDING_FIXES.md` (Grupo D).
- **Problema**: El rewrite wildcard `path="*"` muestra la página 404 en el cliente, pero el servidor responde con 200 OK. Tampoco hay metatags OpenGraph renderizados en servidor para scrapers estáticos.
- **Fix futuro**: Evaluar prerender/SSG de rutas o Edge Middleware en Vercel para responder 404 real y tags OpenGraph en páginas estáticas.
- **Estado**: **pendiente** — deferido por Santiago (2026-11-11): solo si el SEO de URLs externas importa.
