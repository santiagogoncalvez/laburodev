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
