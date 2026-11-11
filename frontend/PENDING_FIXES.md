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
- **Fix futuro**: `AbortController` guardado en un `ref`, `controller.abort()`
  en el cleanup de un `useEffect`, y limpiar/reiniciar `summary` al cambiar
  `jobId`.

## [useAISummary] Updater impuro en `setSummary` (variable `firstChunk`)

- **Detectado**: Grupo B (2026-11-11).
- `firstChunk` se **muta dentro del updater** de `setSummary`: los updaters
  deben ser puros. React puede invocarlos más de una vez (StrictMode o modo
  concurrencia) y el resultado sería `prev + chunk` en vez de reemplazar el
  resumen anterior → primer chunk duplicado. Hoy **no manifiesta** porque
  `main.jsx` no envuelve la app en `<StrictMode>`, pero es una bomba de
  tiempo si se activa.
- **Fix futuro**: decidir "reemplazo vs append" fuera del updater (un `ref`
  booleano) y pasarle el valor ya calculado.

## [useAISummary] Sin guard de concurrencia en `generateSummary`

- **Detectado**: Grupo B (2026-11-11).
- Dos invocaciones rápidas (doble click en "Generar") lanzan **dos streams
  concurrentes** escribiendo al mismo estado `summary` → chunks entrelazados
  de dos resúmenes distintos.
- **Fix futuro**: ignorar la llamada si `loading` ya es `true`, o abortar el
  stream anterior antes de empezar uno nuevo.

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
- **Fix futuro**: async/await con flag `cancelled` + `AbortController`, y en
  `!ok` hacer `throw` (o `return`) en vez de continuar.

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
- **Fix futuro (backend/seed)**: que el seed divida el markdown en array
  (o `parseJsonArray` acepte string → `[string]`) para restaurar el contenido
  real de las secciones.

## [Register] Labels con `htmlFor` que no coincide con el `id`

- **Detectado**: Grupo C (2026-11-11), revisión de props.
- `Register.tsx`: `<label htmlFor="name">` y `<label htmlFor="password">` están
  hardcodeados, pero los inputs usan `id={nameId}` / `id={passwordId}`
  (useId) → labels huérfanas, clic no enfoca el input (accesibilidad).
  En `Login.tsx` sí están bien (`htmlFor={emailId}` / `{passwordId}`).
- **Fix futuro**: usar `htmlFor={nameId}` y `htmlFor={passwordId}`.
