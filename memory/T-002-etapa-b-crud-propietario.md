# EXPEDIENTE: T-002 - Etapa B: CRUD de Empleos por Propietario

- **Fecha:** 2026-11-19
- **Categoría (Triage):** FEATURE
- **Estado:** ESPERANDO_APROBACION

## 1. ¿PARA QUÉ SE HACE? (Contexto y Ruta de Trabajo)
<!-- Completado por el Coordinador en Modo Plan -->
- **Problema o Necesidad de Negocio:** Hoy cualquier usuario autenticado no puede publicar empleos: las escrituras de `/jobs` están protegidas por un guard temporal `x-api-key` (guard interno, no pensado para usuarios finales). Se necesita que un usuario gestione sus propios empleos (crear/editar/eliminar) y que solo el dueño vea los controles de edición, reemplazando el guard por autorización por sesión + ownership.
- **Resultado Esperado:** Usuario logueado crea `/jobs/new`, edita `/jobs/:id/edit` y elimina desde `/jobs/:id`; backend responde 401 (sin sesión), 403 (no dueño o empleo del seed), 404 (inexistente); los empleos del seed quedan de solo lectura; `x-api-key` desactivado de las rutas (archivo conservado para Fase 3).
- **Pipeline de Agentes Asignado:**
  - [ ] Paso 1: 02-arquitecto - Contrato SDD (Sección 2) — *completado en Modo Plan*
  - [ ] Paso 2: 03-tester - Tests en rojo (401/403/404 + ownership)
  - [ ] Paso 3: 04-implementador - Código hasta verde (backend + frontend)
  - [ ] Paso 4: 05-reviewer - Auditoría + tarjeta de entrega

## 2. CONTRATO TÉCNICO Y PLAN DE ARCHIVOS (La Especificación para el Implementador)
<!-- Completado por 02-arquitecto -->

### 2.1 Esquema DB y migración
- **Modificar `backend/db/schema.sql`:** agregar a `jobs` → `user_id TEXT NULL` (nullable; empleos del seed quedan NULL = solo lectura). **Sin FK a `"user"`**: decisión minimalista para que la migración (`ALTER TABLE ... ADD COLUMN`) y el schema nuevo coincidan 1:1; si el usuario se borra, sus empleos quedan como "sin dueño" (403 para todos), coherente con el comportamiento del seed.
- **Modificar `backend/db/seed.ts`:** en el bloque de migración existente (`PRAGMA table_info(jobs)`), agregar:
  `if (!columns.includes("user_id")) await db.execute("ALTER TABLE jobs ADD COLUMN user_id TEXT NULL");`
- **No tocar** el dataset de `jobs.json` ni los empleos existentes.

### 2.2 Tipos y espejo frontend
- **Modificar `backend/types/index.ts`:** `interface Job` agrega `userId: string | null`.
- **Modificar `frontend/src/types/api.ts`:** mismo campo `userId: string | null` (espejo intencional, ver comentario del archivo).
- **Modificar `backend/models/jobs.ts`:**
  - `mapRow`: mapear `user_id` → `userId` (`typeof row.user_id === "string" ? row.user_id : null`).
  - `create(input, userId: string)`: el `INSERT` agrega columna `user_id`.
  - `update`/`partialUpdate`/`delete`: **sin cambio** (el ownership se resuelve antes, en el service).

### 2.3 Servicio con ownership (lógica de negocio)
- **Modificar `backend/services/jobsService.ts`:**
  - `ServiceError` agrega código: `{ ok: false; code: "forbidden" }`.
  - `create(body, userId)`: valida Zod y llama `JobModel.create(parsed.data, userId)`.
  - `update(id, body, userId)` y `partialUpdate(id, body, userId)`:
    1. Cargar el job → si no existe: `not_found` (404).
    2. Si `job.userId !== userId` (incluye `null` = seed): `forbidden` (403).
    3. Si es dueño: validar Zod y actualizar.
  - `delete(id, userId)`: mismo orden (404 → 403 → eliminar).
- **Modificar `backend/controllers/jobs.ts`:**
  - `sendServiceError`: `forbidden` → `403 { message: "No autorizado para modificar este empleo" }`.
  - `create`/`update`/`partialUpdate`/`delete`: primer paso `const userId = await getSessionUserId(req); if (!userId) return 401 { message: "Sesión requerida" };` y pasan `userId` al service. `GET` no cambia (sigue abierto).
- **Zod `backend/schemas/jobs.ts`: NO se modifica.** El `z.object` ya strippea campos desconocidos (test existente "POST debe ignorar campos desconocidos" lo confirma): un `user_id` mandado por el cliente se descarta y lo asigna solo el servidor. *(Desviación mínima de la redacción del ticket — "agregar user_id como opcional en la entrada" — la intención "que el servidor lo asigne, no el cliente" se cumple mejor sin exponerlo en el schema. Aprobar para confirmar.)*

### 2.4 Rutas
- **Modificar `backend/routes/jobs.ts`:** quitar `writeGuard` de POST/PUT/PATCH/DELETE (las 4 escrituras pasan a autorización por sesión+ownership dentro del controller). Mantener `middlewares/writeGuard.ts` intacto y sin usar.
- **Modificar `backend/app.ts`:** montar el mismo router en alias same-origin: `app.use("/api/jobs", jobsRouter)` (además del `/jobs` actual). **Por qué:** las escrituras con cookies de sesión requieren mismo origen (Vite proxy `/api` → `:3000` en dev y rewrite de Vercel en prod ya existen; CORS con credentials no se usa en jobs por diseño de la Fase 1). Los GET existentes del frontend (`${API_URL}/jobs`) no se tocan.
- **PATCH recibe el mismo tratamiento que PUT** (sesión + ownership): es la misma vía de escritura; dejarla sin proteger sería un hueco de seguridad. *(Cobertura extra al alcance del ticket — aprobar para confirmar.)*

### 2.5 Frontend
- **Crear `frontend/src/lib/jobsApi.ts`:** escrituras same-origin → `fetch('/api/jobs'...)` con `Content-Type: application/json` (mismo patrón que `favoritesApi.ts`, cookies viajan solas): `createJob(input)`, `updateJob(id, input)`, `deleteJob(id)`. Tipos de entrada: `Partial`-ish mínimo del `JobInput` (title, company, location, description, data{technology,mode,level}, content opcional).
- **Crear `frontend/src/pages/JobFormPage.tsx` (+ `JobFormPage.module.css` o reutilizar clases globales de form):** componente único que sirve para `/jobs/new` (create) y `/jobs/:id/edit` (update, precarga datos vía GET `${API_URL}/jobs/:id`). Campos mínimos: título, empresa, ubicación, descripción, tecnologías (mínimo 1), nivel, modalidad. Errores del backend en pantalla. Éxito: create → navega al detalle del job creado; edit → vuelve al detalle.
- **Modificar `frontend/src/App.tsx`:** dos rutas nuevas envueltas en `<ProtectedRoute redirectTo="/login">`: `/jobs/new` y `/jobs/:id/edit`.
- **Modificar `frontend/src/pages/Detail.tsx`:**
  - Botones **"Editar"** (→ `/jobs/:id/edit`) y **"Eliminar"** (confirm nativo `window.confirm` → `deleteJob` → navega a `/search`) renderizados **solo si** `session?.user.id === job.userId`.
  - El fetch del detalle pasa a `/api/jobs/:id` (alias montado en 2.4) para que el GET traiga cookies y el `useSession` del cliente y el `userId` del job se comparen en mismo origen. *(Si se prefiere mantener `${API_URL}/jobs/:id`: el campo `userId` igual viaja en la respuesta y la comparación funciona; la cookie solo importa para escrituras. Decisión: migrar el GET del detalle al alias — un solo origen para todo el flujo de dueño.)*
- **No se tocan:** `Search`, `JobListings`, `Header`, `favorites`, IA, ni el seed visual del home.

### 2.6 Invariantes y Reglas de Negocio
- GET `/jobs`, `/jobs/:id`, `/jobs/options`: **abiertos** (lectura pública sin cambios).
- Empleos con `user_id = NULL` (seed): 403 en toda escritura, para cualquier usuario.
- El cliente **nunca** asigna `user_id` (solo el servidor, desde la sesión).
- Sin roles (Etapa C), sin verificación de email, sin dependencias nuevas.
- `x-api-key`: fuera de las rutas; `WRITE_API_KEY` deja de ser necesaria (tests y CI: ver 2.7).
- Commits: solo Santiago (vía `@super-commit`); rama `spike/sena-sdd` durante el piloto.

### 2.7 Escenarios de Prueba (Gherkin) — para el 03-tester
1. **Dado** sin sesión, **Cuando** `POST /jobs`, **Entonces** 401.
2. **Dado** con sesión, **Cuando** `POST /jobs` válido, **Entonces** 201 y `job.userId` = id del usuario en sesión.
3. **Dado** con sesión, **Cuando** `PUT /jobs/:id` de empleo propio, **Entonces** 200 y los campos se actualizan.
4. **Dado** con sesión, **Cuando** `PUT /jobs/:id` de empleo de otro usuario, **Entonces** 403.
5. **Dado** con sesión, **Cuando** `PUT /jobs/:id` de empleo del seed (`user_id` NULL), **Entonces** 403.
6. **Dado** con sesión, **Cuando** `PUT /jobs/:id` con id inexistente, **Entonces** 404.
7. **Dado** sin sesión, **Cuando** `DELETE /jobs/:id`, **Entonces** 401.
8. **Dado** con sesión, **Cuando** `DELETE /jobs/:id` propio, **Entonces** 204.
9. **Dado** con sesión, **Cuando** `DELETE /jobs/:id` ajeno o seed, **Entonces** 403.
10. **Dado** sin sesión, **Cuando** `PATCH /jobs/:id`, **Entonces** 401; con sesión ajeno → 403.
11. **Dado** el `GET /jobs/:id`, **Entonces** incluye `userId` (`string | null`).
12. **Regresión:** los tests existentes de validación Zod de POST/PUT/DELETE siguen pasando — migrados de `x-api-key` a cookie de sesión (patrón `sign-up/email` de `favorites.test.js`). El bloque `describe("writeGuard")` de `app.test.js` se **elimina** (el guard ya no está en las rutas).

## 3. REGISTRO DE PRUEBAS (QA Automation)
<!-- Completado por 03-tester -->
- **Archivos de test generados:** `backend/app.test.js` (modificado):
  - Migración de autorización: `writeHeaders` (x-api-key) → `ownerHeaders` (cookie de sesión vía `sign-up/email`, patrón de `favorites.test.js`); 24 usos migrados.
  - Dos usuarios de test (`jobs-owner-test@`, `jobs-other-test@`) con limpieza idempotente en `before`/`after` (jobs, favorites, session, account, user).
  - Bloque `describe("writeGuard (x-api-key)")` **eliminado** (4 tests): el guard ya no está en las rutas.
  - Nuevos: `describe("Autorización por sesión")` — 401 sin sesión en POST/PUT/PATCH/DELETE; GET abierto; POST con sesión asigna `userId`.
  - Nuevos: `describe("Ownership: solo el dueño edita/borra")` — GET devuelve `userId` (null en seed, string en creado); 403 en PUT/DELETE/PATCH ajeno y seed; 404 con sesión en id inexistente.
- **Casos cubiertos:** escenarios Gherkin 1-11 del contrato (12 cubierto por migración de los tests Zod existentes que ahora corren con sesión).
- **Confirmación de fallo inicial RED:** ✅ corrida con `NODE_ENV=test` → `fail 1`+ con `SQLITE_ERROR: no such column: user_id` (la columna aún no existe en la DB) — los tests de sesión/ownership no pueden pasar hasta que el `04-implementador` complete el trabajo.

## 4. ¿POR QUÉ SE HIZO ASÍ? (Decisiones Técnicas de Implementación)
<!-- Completado por 04-implementador tras pasar los tests a VERDE -->

- **Sesión primero, después todo:** el controller pide la sesión (`requireUserId`) antes de tocar el service → sin sesión cualquier escritura responde 401 con body validado o no (los tests lo verifican con body válido).
- **Ownership en el service, no en el model:** `JobService.checkOwnership(id, userId)` carga el empleo (404 si no existe) y compara `job.userId !== userId` → 403. Así el orden 404→403 queda garantizado en un solo lugar para PUT, PATCH y DELETE.
- **Código de dominio `forbidden`:** se agregó al union `ServiceError` y `sendServiceError` lo traduce a 403; los códigos existentes (`invalid_input`, `not_found`) no se tocaron.
- **`user_id TEXT NULL` sin FK:** el contrato lo define así — el seed no tiene usuarios y agregar FK rompería el INSERT del seed. La integridad la da la aplicación (solo el server asigna el valor). Migración 1:1 en `schema.sql` + `ALTER TABLE` idempotente en `seed.ts` (patrón existente de `modality`/`technology`).
- **Zod sin cambios:** el schema ya strippa claves desconocidas, así que un `user_id` enviado por el cliente se descarta y el servidor asigna el suyo (test explícito: el `userId` devuelto nunca es el que mandó el cliente).
- **Alias `/api/jobs`:** mismo `jobsRouter` montado en dos paths — `/jobs` (CORS absoluto, compatibilidad con lo existente) y `/api/jobs` (same-origin para que la cookie viaje por el proxy de Vite y el rewrite de Vercel, igual que `/api/favorites`). El frontend usa el alias en todas sus llamadas.
- **PATCH también exige ownership** (decisión aprobada): cerraba un hueco — con solo PUT protegido, PATCH quedaba abierto a cualquier sesión.
- **Frontend mínimo:** `JobFormPage.tsx` único para crear y editar (prefill vía effect + `AbortController`), botones en `Detail.tsx` condicionados a `session.user.id === job.userId`, rutas protegidas con `ProtectedRoute` existente, y entrada "Publicar empleo" en el panel del `UserMenu`.
- **Tests sin dependencia de orden:** los dos usuarios de test se limpian en `before` y `after` (idempotente, patrón de `favorites.test.js`); el empleo seed se busca por `userId === null` en vez de hardcodear un id.

## 5. ¿CON QUÉ SE HIZO? (Inventario Técnico y Auditoría)
<!-- Completado por 05-reviewer -->
- **Estado de Auditoría:** `APROBADO`
- **Inventario de archivos modificados/creados:**
  - `backend/db/schema.sql` (modificado): columna `user_id TEXT NULL` agregada a la tabla `jobs`.
  - `backend/db/seed.ts` (modificado): migración `ALTER TABLE jobs ADD COLUMN user_id TEXT NULL` idempotente.
  - `backend/types/index.ts` (modificado): `userId: string | null` en interfaz `Job`.
  - `backend/models/jobs.ts` (modificado): `mapRow` expone `userId`; `create(input, userId)` asigna el dueño.
  - `backend/services/jobsService.ts` (modificado): `ServiceError` sumó `forbidden`; `checkOwnership()` valida 404/403 en PUT, PATCH y DELETE; firmas actualizadas con `userId`.
  - `backend/controllers/jobs.ts` (modificado): `requireUserId()` para 401 sin sesión; traduce `forbidden` a 403.
  - `backend/routes/jobs.ts` (modificado): `writeGuard` removido de POST/PUT/PATCH/DELETE (archivo de middleware conservado para la Fase 3 con roles).
  - `backend/app.ts` (modificado): alias `/api/jobs` same-origin para que la cookie viaje por el proxy en dev y rewrite en prod.
  - `backend/app.test.js` (modificado): 24 usos de `writeHeaders` migrados a cookies de sesión (`sign-up/email`); `writeGuard` describe eliminado; describes de sesión y ownership agregados (53/53 tests en verde).
  - `frontend/src/types/api.ts` (modificado): `userId: string | null` en interfaz `Job`.
  - `frontend/src/lib/jobsApi.ts` (creado): `createJob`, `updateJob`, `deleteJob` usando el alias same-origin `/api/jobs`.
  - `frontend/src/pages/JobFormPage.tsx` (creado): formulario unificado de creación (`/jobs/new`) y edición (`/jobs/:jobId/edit`) con prefill y manejo de errores.
  - `frontend/src/pages/Detail.tsx` (modificado): `DetailOwnerActions` renderiza botones Editar/Eliminar solo si `session.user.id === job.userId`; confirmación previa a eliminar.
  - `frontend/src/pages/Detail.module.css` (modificado): estilos para `titleActions`, `ownerActions`, `ownerButton`, `ownerButtonDanger`, `ownerError`.
  - `frontend/src/App.tsx` (modificado): rutas `/jobs/new` y `/jobs/:jobId/edit` protegidas con `ProtectedRoute`.
  - `frontend/src/components/UserMenu.tsx` (modificado): opción "Publicar empleo" agregada al panel del menú de usuario.
- **Verificación QA:**
  - `npm run typecheck` en `backend/`: PASS (0 errores)
  - `npm run typecheck` en `frontend/`: PASS (0 errores)
  - `npm run lint` desde la raíz: PASS (exit 0, 1 warning en `Home.module.css` preexistente)
  - `npm test` en `backend/` (`NODE_ENV=test`): PASS (53/53 tests)

## 6. TARJETA DE ENTREGA PARA TRELLO
<!-- Completado por 05-reviewer -->
- **Qué pasaba:** Las escrituras de empleos dependían de una API key temporal (`x-api-key`) y cualquier persona podía modificar o eliminar cualquier empleo. No existía la pantalla ni el formulario para publicar o editar empleos desde la web.
- **Qué se hizo:** Se integró la autorización por sesión (Better Auth) y el control de propiedad (ownership). Los usuarios autenticados ahora pueden publicar nuevos empleos desde `/jobs/new`, y únicamente el creador de un empleo ve y puede ejecutar las acciones de Editar y Eliminar en su página de detalle. Los empleos creados antes de esta actualización (seed) son de solo lectura.
- **Cómo probarlo paso a paso:**
  1. Abrir la app en `http://localhost:5173`.
  2. Iniciar sesión o registrar un usuario nuevo.
  3. En el menú de usuario (icono de perfil arriba a la derecha), hacer clic en **"Publicar empleo"**.
  4. Completar el formulario (Título, Empresa, Ubicación, Descripción, Tecnologías separadas por coma, Nivel, Modalidad) y hacer clic en **"Publicar empleo"**.
  5. Verificar que sos redirigido al detalle (`/jobs/:id`) y que aparecen los botones **"Editar"** y **"Eliminar"**.
  6. Hacer clic en **"Editar"**, cambiar algún dato y guardar. Verificar que los cambios se reflejan.
  7. Ir a un empleo del seed (cualquiera de la lista inicial). Verificar que **NO** aparecen los botones de edición/eliminación.
  8. En el empleo propio, hacer clic en **"Eliminar"**, aceptar la confirmación y verificar el regreso a la búsqueda sin ese empleo.
