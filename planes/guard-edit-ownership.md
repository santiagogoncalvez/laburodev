# Guard de ownership en el formulario de edición

## Contexto

La ruta `/jobs/:jobId/edit` solo valida sesión + rol `recruiter` (`ProtectedRoute`), pero **no** chequea que el empleo sea del usuario. Cualquier recruiter puede abrir la URL de edición de un empleo ajeno, ver el formulario completo con los datos y recién al guardar recibe el 403 del servidor ("No autorizado para modificar este empleo").

El backend está **bien**: el servidor es la autoridad y no permite la modificación (hay tests de ownership y roles que lo cubren). El problema es de UX: la interfaz promete algo que después se niega. Lo correcto es negar al cargar la ruta, no al guardar.

## Qué hay que cambiar

**Archivo: `frontend/src/pages/JobFormPage.tsx`**

1. Traer la sesión con `useSession` (import de `@/lib/auth-client`, mismo patrón que `Detail.tsx`).
2. En el `useEffect` de carga (`loadJob`), después del `GET /api/jobs/:id`, comparar:
   - `session.user.id === job.userId` → dueño: cargar el formulario como hoy.
   - Distinto usuario o `job.userId` null (empleos del seed) → **no** setear el form; redirigir con `<Navigate to={\`/jobs/${jobId}\`} replace />` (o `navigate(..., { replace: true })`), o mostrar un estado "No sos el dueño de este empleo" con link al detalle. Elegir la redirección al detalle: es lo más simple y consistente con `ProtectedRoute`.
3. Comentario explicando el porqué (estilo del repo: comentarios en español que expliquen la intención).

**No tocar nada más.** El patrón de comparación ya existe y se puede copiar de `frontend/src/pages/Detail.tsx` (`DetailOwnerActions`, línea ~81: `session?.user?.id != null && session.user.id === job.userId`).

## Qué NO hacer

- **No tocar el backend**: ya responde 403 correctamente y tiene sus tests.
- **No tocar `ProtectedRoute`**: sigue validando sesión + rol; el ownership es responsabilidad de la página.
- **No agregar dependencias** (ni vitest ni nada): la verificación es manual/Stagehand.
- **No cambiar el flujo de creación** (`/jobs/new`): ese no tiene ownership que chequear.
- **No modificar `Detail.tsx`**: ya funciona bien.
- No crear carpeta `e2e/` ni limpiar referencias viejas (eso es otra cosa).

## Casos borde

- **`job.userId` null** (empleos del seed): nadie puede editarlos → también se redirige al detalle.
- **Sesión pendiente**: no pasa, porque `ProtectedRoute` ya espera a que resuelva la sesión antes de renderizar la página (devuelve `RouteFallback` mientras `isPending`).
- **Empleo inexistente (404)**: mantener el mensaje de error actual ("El empleo que intentás editar no existe").
- **Usuario sin sesión** (alguien que tipea la URL): ya lo redirige `ProtectedRoute` a `/login` — sin cambios.

## Cómo verificar

Con dos cuentas: **A** (dueña de un empleo) y **B** (recruiter distinta), entornos locales arriba (`:5173` + `:3000`):

1. Desde A, crear un empleo (`/jobs/new`).
2. Copiar la URL de edición (`/jobs/<id>/edit`) y abrirla con la sesión de B.
   - **Esperado:** redirige a `/jobs/<id>` (detalle), NO muestra el formulario.
3. Abrir la misma URL con la sesión de A.
   - **Esperado:** el formulario carga normal y guarda (200).
4. Repetir el paso 2 con la URL de edición de un empleo del seed (sin dueño).
   - **Esperado:** también redirige al detalle.
5. Regresión: con A, verificar que "Editar" desde el detalle sigue funcionando y que `/jobs/new` publica normal.
6. Suite de backend sin cambios en verde: `NODE_ENV='test' npm test -- --test-skip-pattern="AI"` (63/63).
