# Errores detectados durante migración TS

Bitácora de problemas de **LÓGICA** (no de tipado) encontrados al migrar.
No se arreglan durante la migración (regla del plan §4); se resuelven en la
fase de estabilización posterior.

## [useAISummary] Stream sin cancelación (AbortController / cleanup)

- **Detectado**: Grupo B (2026-11-11), revisión con `@frontend-async-best-practices`.
- El `fetch` no usa `AbortController` y no hay cleanup al desmontar: si el
  componente se desmonta o cambia el `jobId` mientras el stream está abierto,
  el loop `reader.read()` sigue vivo y sigue llamando `setSummary` → posible
  contenido mezclado de resúmenes (viejo + nuevo) y trabajo post-unmount.
- **✅ Resuelto** (2026-11-11, estabilización): `controllerRef` + abort en el
  cleanup del `useEffect [jobId]`, reinicio de `summary`/`error`/`loading` al
  cambiar de `jobId`, y guard `aborted` en el loop del reader.

## [useAISummary] Updater impuro en `setSummary` (variable `firstChunk`)

- **Detectado**: Grupo B (2026-11-11).
- `firstChunk` se **muta dentro del updater** de `setSummary`: los updaters
  deben ser puros. React puede invocarlos más de una vez (StrictMode o modo
  concurrencia) y el resultado sería `prev + chunk` en vez de reemplazar el
  resumen anterior → primer chunk duplicado. Hoy **no manifiesta** porque
  `main.tsx` no envuelve la app en `<StrictMode>`, pero es una bomba de
  tiempo si se activa.
- **✅ Resuelto** (2026-11-11, estabilización): el flag vive en `firstChunkRef`
  y el updater recibe `isFirstChunk` ya calculado → updater puro.

## [App/SEO] SPA sin status HTTP 404 real ni meta og:

- **Detectado**: Grupo D (2026-11-11), verificación de metadata/SEO.
- El wildcard `path="*"` renderiza `NotFoundPage` correctamente, pero el
  servidor responde **200** en URLs inexistentes (Vercel sirve el SPA con
  rewrite) — los crawlers ven "200 OK" en páginas que no existen.
- Tampoco hay meta `og:`/`twitter:` por página: los scrapers que **no
  ejecutan JS** (la mayoría de los que leen og:) solo ven el HTML inicial.
- Fix futuro (solo si el SEO de URLs externas importa): prerender/SSG de
  rutas o edge middleware en Vercel que responda 404 real + HTML prerendered.
- Nota: títulos por página ✓ implementados en Grupo D (React 19 hoistea
  `<title>` a `<head>`), description global ✓ en `index.html`.

## [useAISummary] Sin guard de concurrencia en `generateSummary`

- **Detectado**: Grupo B (2026-11-11).
- Dos invocaciones rápidas (doble click en "Generar") lanzan **dos streams
  concurrentes** escribiendo al mismo estado `summary` → chunks entrelazados
  de dos resúmenes distintos.
- **✅ Resuelto** (2026-11-11, estabilización): al invocar se aborta el stream
  anterior (`controllerRef`) y se arranca uno nuevo — sin streams concurrentes.

## Auditoría de la skill `frontend-async-best-practices`

- Regla **parallel**: sin waterfalls — hay un solo `fetch` por invocación y
  ninguna operación independiente que paralelizar. ✅
- Regla **defer-await**: sin awaits innecesarios en ramas que no los usan. ✅
- Reglas `dependencies` / `api-routes` / `suspense-boundaries`: no aplican
  (no hay loaders, ni cadenas dependientes, ni componentes con Suspense en
  esta capa). Pendiente de revisar en el Grupo C (UI).

## [Detail] Fetch de detalle sin abort y continúa tras `!ok`

- **Detectado**: Grupo C (2026-11-11), tipado del `useEffect` de `JobDetail`.
- Tres problemas en la misma cadena:
  1. Sin `AbortController` ni cleanup: cambiar de `jobId` rápido (o desmontar)
     deja el fetch anterior vivo; la respuesta vieja puede pisar la nueva
     (carrera clásica sin `cancelled` flag).
  2. En `!ok` hace `navigate("/not-found")` pero **sigue ejecutando**
     `return response.json()` → `setJob(json)` con el body de error; si la
     navegación gana la carrera, se renderiza un "empleo" que es un objeto de
     error.
  3. Deps `[jobId]` omiten `navigate` (estable en react-router, pero incompleto
     para el linter).
- **✅ Resuelto** (2026-11-11, estabilización): async/await + `AbortController`
  con flag de cancelación (catch/finally ignoran aborts), `return` en `!ok`
  (sin `response.json()` sobre el body de error) y deps `[jobId, navigate]`.

## [Detail / datos] Responsabilidades y Requisitos siempre vacíos (bug de datos)

- **Detectado**: Grupo C (2026-11-11) — **crash de producción en `/jobs/:id`**.
- Cadena: `jobs.json` guarda `responsibilities`/`requirements` como **strings**
  markdown → `seed.ts` hace `JSON.stringify(string)` (DB guarda un JSON-string)
  → `models/jobs.ts#parseJsonArray` espera JSON-array → devuelve **`[]` en
  todas las filas** → la API sirve arrays vacíos.
- Además el frontend pasaba ese array a `snarkdown(string)` → `TypeError:
  a.replace is not a function` → página en blanco (sin ErrorBoundary).
- **Fix aplicado (Grupo C, aprobado por Santiago)**: mínimo —
  `content={job.content.responsibilities.join("\n")}` en `Detail.tsx`
  (crash → secciones vacías). Documentado en el código con comentario.
- **✅ Resuelto** (2026-11-11, estabilización): `parseJsonArray` ahora acepta
  JSON-string → `[string]` (las filas viejas se sirven **sin re-seed**) y el
  seed envuelve con `toArray()` al sembrar. Frontend conserva `join("\n")` ✓.
  Opcional: re-seed para dejar las filas con formato array en la DB.

## [Register] Labels con `htmlFor` que no coincide con el `id`

- **Detectado**: Grupo C (2026-11-11), revisión de props.
- `Register.tsx`: `<label htmlFor="name">` y `<label htmlFor="password">` están
  hardcodeados, pero los inputs usan `id={nameId}` / `id={passwordId}`
  (useId) → labels huérfanas, clic no enfoca el input (accesibilidad).
  En `Login.tsx` sí están bien (`htmlFor={emailId}` / `{passwordId}`).
- **✅ Resuelto** (2026-11-11, estabilización): usar `htmlFor={nameId}` y
  `htmlFor={passwordId}`.

## [Detail/XSS] snarkdown pasaba HTML crudo a `dangerouslySetInnerHTML`

- **Detectado**: Fase Final (2026-11-11), auditoría `@security-review`.
- Empírico: `snarkdown('<img src=x onerror=alert(1)>')` inyectaba el HTML tal
  cual (snarkdown no sanitiza). Precondición: contenido que requiere
  `WRITE_API_KEY` o DB comprometida → XSS almacenado en los visitantes de la
  oferta.
- **✅ Resuelto** (2026-11-11): `DOMPurify.sanitize(snarkdown(content))` en
  `JobSection` (`Detail.tsx`). El resumen IA (`Streamdown`) ya sanitizaba con
  `rehype-sanitize` ✓.

## [deps] Vulnerabilidades residuales del backend (cadena AI SDK / undici)

- **Detectado**: Fase Final (2026-11-11), `npm audit`.
- Frontend: **0 vulnerabilities** tras `npm audit fix` + quitar `zod` (sin uso
  en `src/`) + mover `playwright`/`stagehand` a devDependencies.
- Backend: quedan **6 (2 high)** en `@fastify/busboy ← undici ←
  @ai-sdk/provider-utils ← @ai-sdk/google ← ai`. El único fix de npm es
  `npm audit fix --force` (**breaking**: `@ai-sdk/google` → 4.x) o subir el AI
  SDK a un mayor con undici parcheado. Riesgo práctico bajo hoy: la API no
  maneja multipart ni pasa input no confiable a undici (los advisories son
  DoS/CRLF en parsing multipart).
- **Fix futuro**: planificar upgrade de `ai` + `@ai-sdk/google` y verificar
  con la suite (streaming real de `/ai/summary` incluido).
