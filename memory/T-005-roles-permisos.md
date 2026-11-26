# EXPEDIENTE: T-005 - Etapa C: roles y permisos de publicación

- **Fecha:** 2026-11-26
- **Categoría (Triage):** FEATURE
- **Estado:** ESPERANDO_APROBACION

## 1. ¿PARA QUÉ SE HACE? (Contexto y Ruta de Trabajo)
<!-- Completado por el Coordinador -->

- **Problema o Necesidad de Negocio:** hoy cualquier usuario con sesión puede crear, editar y borrar empleos. No existe la distinción entre quien busca trabajo y quien publica ofertas. El `ROADMAP.md` prevé para la Etapa C roles, verificación de email y permisos; Santiago acordó el 2026-11-26 que este grupo cubre **solo roles + permisos**.
- **Resultado Esperado:** dos roles (`candidate` por defecto, `recruiter` opt-in); solo `recruiter` puede publicar y administrar **sus propios** empleos; `candidate` puede buscar y usar favoritos; el servidor hace valer el rol además del ownership existente; la UI muestra el rol y esconde la publicación a quien no puede publicar; los registros del proyecto quedan actualizados.
- **Pipeline de Agentes Asignado:**
  - [x] Paso 0: Coordinador - Fase 0 (auditoría de claridad) y Fase 1 (triage FEATURE) + Sección 1
  - [x] Paso 1: 02-arquitecto - Contrato técnico (Sección 2), adaptado a A, B y T-004
  - [ ] Paso 2: **[PAUSA: aprobación del contrato por Santiago]**
  - [ ] Paso 3: 03-tester - tests RED (incluye migración del rol y permisos)
  - [ ] Paso 4: 04-implementador - código hasta VERDE
  - [ ] Paso 5: **[STOP: consulta de modelo]** → 05-reviewer - auditoría y tarjeta de entrega

### 1.1 Adaptación obligatoria frente a la base del plan (pedido explícito de Santiago)
La Etapa C se diseña sobre el estado real del proyecto, no sobre el texto original del roadmap:

1. `x-api-key` / `writeGuard` **ya no están montados** (se removieron en la Etapa B). `WRITE_API_KEY` sigue en `.env`/Vercel pero sin uso: **no se reactiva**.
2. El auth mock de Zustand **ya no existe**: hay Better Auth real con cookies de mismo origen y favoritos persistidos.
3. El ownership por `jobs.user_id` (401/403/404) **ya funciona**: los permisos por rol se suman encima, no lo reemplazan.
4. La base ya no se puebla con un seed manual: T-004 agregó migrate aditivo automático antes de cada deploy. La columna nueva de rol debe pasar por ese migrate; **nunca** por seed/reset en producción.
5. El frontend es 100% TypeScript y el Perfil ya muestra datos de la sesión real; no se crean pantallas nuevas ni se revive el editor de nombre descartado en la Etapa A.
6. `HANDOFF.md` §4.2 y `RESUMEN-PROYECTO.md` §5 todavía describen auth mock y guard pendiente: se corrigen en este mismo grupo.

## 2. CONTRATO TÉCNICO Y PLAN DE ARCHIVOS (La Especificación para el Implementador)
<!-- Contrato Técnico Inmutable — 02-arquitecto (2026-11-26) -->

### 2.1 Archivos a crear/modificar

| Archivo | Acción | Qué se toca |
|---|---|---|
| `backend/db/schema.sql` | Modificar | Agregar `"role" TEXT NOT NULL DEFAULT 'candidate'` a la tabla `"user"` (para DBs nuevas). |
| `backend/db/seed.ts` | Modificar | Extender el bloque de `PRAGMA table_info` para la tabla `"user"`: si falta `role`, `ALTER TABLE ADD COLUMN`. Misma semántica aditiva e idempotente de `--schema-only`. Sin `DELETE`, `DROP` ni `UPDATE` de datos. |
| `backend/auth.ts` | Modificar | Declarar `role` como `additionalField` de usuario (string, default `candidate`) para que Better Auth lo persista y lo devuelva en la sesión. Sin plugins de admin ni verificación de email. |
| `backend/middlewares/session.ts` | Modificar | Agregar `getSessionUserRole(req): Promise<"candidate" \| "recruiter" \| null>` leyendo `session.user.role`. `getSessionUserId` queda intacto. |
| `backend/services/jobsService.ts` | Modificar | `create`, `update`, `patch` y `remove` reciben el rol y devuelven `forbidden` con mensaje de rol antes de la operación. El ownership existente queda igual. |
| `backend/controllers/jobs.ts` | Modificar | Obtener session + rol en escrituras; pasar el rol al servicio; traducir el `forbidden` con mensaje de rol a 403. Sin lectura de `WRITE_API_KEY`. |
| `frontend/src/types/api.ts` | Modificar | `UserRole = "candidate" \| "recruiter"` y helper `getUserRole(user: unknown): UserRole` sin `as`/`any`. |
| `frontend/src/pages/Register.tsx` | Modificar | Checkbox opcional "Quiero publicar empleos": si se marca, `role: "recruiter"` en `signUp.email`; si no, `candidate`. |
| `frontend/src/pages/ProfilePage.tsx` | Modificar | Mostrar el rol. Si es `candidate`, botón "Quiero publicar empleos" que llama a `authClient.updateUser({ role: "recruiter" })` (camino de ida, sin downgrade). |
| `frontend/src/components/UserMenu.tsx` | Modificar | Mostrar "Publicar empleo" solo si `getUserRole(...) === "recruiter"`. |
| `frontend/src/components/ProtectedRoute.tsx` | Modificar | Prop opcional `role?: UserRole`: con sesión pero rol distinto, redirigir a `/search`. Sin sesión, sigue redirigiendo a `/login`. |
| `frontend/src/App.tsx` | Modificar | Pasar `role="recruiter"` a las rutas `/jobs/new` y `/jobs/:jobId/edit`. `/profile` queda igual. |
| `frontend/src/pages/Auth.module.css` / `frontend/src/pages/ProfilePage.module.css` | Modificar (si hace falta) | Estilos mínimos para checkbox/badge/botón con tokens ya existentes; sin componentes nuevos. |
| `backend/app.test.js` | Modificar | Los usuarios de test se registran con `role: "recruiter"`; agregar usuario `candidate` para los 403 de rol. |
| `backend/migrate-schema.test.js` | Modificar | Verificar que el migrate agrega `role` a `"user"` sin borrar filas y es idempotente. |
| `ROADMAP.md`, `AGENTS.md`, `HANDOFF.md`, `RESUMEN-PROYECTO.md` | Modificar | Marcar Etapa C y corregir los textos desactualizados (auth mock / guard pendiente / features restantes). |

### 2.2 Contrato de comportamiento

**A. Roles y alta**
- `role` acepta solo `"candidate"` o `"recruiter"`. Default en DB y en registro: `"candidate"`.
- El alta desde `Register.tsx` envía `role` junto a `name/email/password`. Cualquier valor fuera de los dos permitidos se fuerza a `"candidate"` en el servidor (fail-safe).
- El cambio `candidate → recruiter` se hace desde el Perfil con un clic. No hay downgrade, no hay panel de administración y no hay aprobación por email. Decisión explícita: proyecto de aprendizaje, el rol habilita funciones; no es una barrera de seguridad de producción.
- Los usuarios ya existentes quedan como `candidate` después del migrate. Si tenían empleos propios, los conservan; deben subir a `recruiter` desde el Perfil para volver a editarlos. No se hace backfill en el migrate (T-004 exige que el migrate sea aditivo).

**B. Permisos HTTP**
- Sin cambios: `GET /jobs`, `GET /jobs/:id`, `GET /jobs/options`, `/ai/*`, favoritos y auth.
- `POST /api/jobs` y `PUT/PATCH/DELETE /jobs/:id`: sin sesión → **401** `"Sesión requerida"`; con sesión `candidate` → **403** `"Se necesita rol recruiter para publicar empleos"`; con `recruiter` no dueño en modificación → **403** `"No autorizado para modificar este empleo"`; con `recruiter` dueño → 201/200/204 según corresponda; id inexistente → **404**.
- Orden de chequeo en el servicio: rol primero, ownership después. Empleos del seed (`user_id NULL`) siguen siendo solo lectura para todos.

**C. Datos**
- Sin tablas nuevas, sin FK, sin verificación de email. Una sola columna en `"user"`.
- El migrate la agrega con `IF NOT EXISTS`/`PRAGMA`, igual que las columnas de `jobs`; correrlo N veces deja el mismo estado y no toma filas.
- `db:seed`, `db:reset` y `db:seed:dev/prod` conservan su significado actual. Producción: solo migrate.

**D. UI**
- `Register`: casilla al lado del botón de alta; texto simple, sin modal.
- `Profile`: línea "Rol: Candidate/Recruiter" + botón de subida solo para candidate.
- `UserMenu`: "Publicar empleo" solo para recruiter.
- `ProtectedRoute`: misma pantalla de carga; para `candidate` en rutas de formulario, `Navigate a /search` (no a `/login`, porque sí hay sesión).
- Estilos con `DESIGN-SYSTEM.md` / tokens actuales; sin emoji ni animaciones nuevas.

**E. Explícitamente fuera de alcance**
- Verificación de email (Santiago la dejó para otro grupo).
- Plugin de admin, roles de administrador, cambio de rol por otro usuario.
- Reactivar `writeGuard` / `x-api-key` / `WRITE_API_KEY`.
- RLS de Postgres: Turso/libSQL no tiene RLS; los permisos se aplican en el servidor.
- Cambios en favoritos, IA, búsqueda ni CI (los tests ya corren en el workflow).

### 2.3 Invariantes y reglas de negocio
1. El migrate sigue siendo aditivo: ni `DELETE`, ni `DROP`, ni `TRUNCATE`, ni `UPDATE` de filas existentes.
2. Ningún seed ni reset se ejecuta automáticamente en producción.
3. El ownership existente (401/403/404) permanece intacto para `recruiter`.
4. Un `candidate` con cookie válida nunca puede crear, editar ni borrar empleos.
5. Un `recruiter` solo modifica empleos propios; los del seed siguen siendo de solo lectura.
6. `WRITE_API_KEY` no se lee en ninguna ruta.
7. Todo usuario nuevo es `candidate` salvo opt-in explícito en el registro.
8. Sin verificación de email ni roles de admin en este ticket.

### 2.4 Escenarios de prueba (Gherkin)

**Escenario 1 — candidate no puede publicar**
```gherkin
Dado que un usuario con rol "candidate" tiene una sesión válida
Cuando envía POST /api/jobs con un empleo válido
Entonces responde 403 con "Se necesita rol recruiter para publicar empleos"
Y no se inserta ningún empleo nuevo
```

**Escenario 2 — recruiter publica y administra sus empleos**
```gherkin
Dado que un usuario con rol "recruiter" tiene una sesión válida
Cuando publica un empleo, lo edita y lo elimina
Entonces las respuestas son 201, 200 y 204
Y el empleo se crea con user_id igual al id del usuario
```

**Escenario 3 — recruiter no puede tocar el empleo de otro**
```gherkin
Dado que hay dos usuarios "recruiter" y un empleo del primero
Cuando el segundo intenta PATCH y DELETE sobre ese empleo
Entonces ambas respuestas son 403 con el mensaje de ownership
Y el empleo sigue existiendo sin cambios
```

**Escenario 4 — migrate agrega el rol sin destruir datos**
```gherkin
Dado que una base existente tiene usuarios y empleos y la columna "role" no existe
Cuando se ejecuta "npm run db:migrate" dos veces
Entonces la columna "role" existe con default "candidate"
Y la cantidad de usuarios y empleos es la misma que antes
Y ambas corridas terminan con código 0
```

**Escenario 5 — interfaz según rol**
```gherkin
Dado que un usuario se registra sin marcar "Quiero publicar empleos"
Cuando abre el menú de cuenta y navega a /jobs/new
Entonces no ve "Publicar empleo" y /jobs/new lo devuelve a /search
Y en el Perfil ve "Rol: Candidate" y el botón para subir a recruiter
Y al subir, el menú muestra "Publicar empleo"
```

**Escenario 6 — regresión de la Etapa B**
```gherkin
Dado que un usuario sin sesión intenta publicar, editar o borrar
Entonces las respuestas siguen siendo 401
Y el seed normal (db:seed) sigue borrando y reinsertando jobs.json
```

### 2.5 Criterios de aceptación
- `NODE_ENV=test npm test` en verde (incluye los 6 escenarios y la suite actual).
- `npm run typecheck` (backend), `npm run build` (frontend) y `npm run lint` (raíz) sin errores.
- Migrate idempotente verificado contra SQLite local; en dev remoto se corre `npm run db:migrate:dev` una vez, sin borrar datos.
- Preview verificada de punta a punta: register con casilla, Perfil, menú y publicación real con recruiter; candidate rechazado con 403 en la API.
- Documentación actualizada antes del reviewer.

## 3. REGISTRO DE PRUEBAS (QA Automation)
<!-- Completado por 03-tester -->
_Pendiente._

## 4. ¿POR QUÉ SE HIZO ASÍ? (Decisiones Técnicas de Implementación)
<!-- Completado por 04-implementador tras pasar los tests a VERDE -->

- **Un solo campo, sin tablas nuevas:** `user.role` con default `candidate` en `schema.sql` y en el `additionalFields` de `auth.ts`. El `transform.input` normaliza cualquier valor raro a `candidate`, así que un registro manipulado no gana permisos.
- **Una sola consulta de sesión por escritura:** `getSessionIdentity(req)` devuelve `{ userId, role }` y lo usa el controlador. `getSessionUserId` y `getSessionUserRole` quedaron como helpers públicos, pero las escrituras no llaman dos veces a Better Auth.
- **Rol antes que ownership:** `JobService` recibe el rol y devuelve `forbidden` con mensaje; `ServiceError.forbidden` ahora lleva `message` para distinguir "falta rol" de "no sos dueño". El controlador solo traduce códigos a HTTP.
- **Sin backfill:** el migrate agrega la columna con default, pero no actualiza filas (invariante T-004). Quien ya tenía empleos los conserva y los recupera con un clic en el Perfil.
- **Frontend sin imports cruzados:** los payloads de `signUp.email` y `updateUser` se construyen como variables (no literales) para que TypeScript acepte el campo `role` sin importar tipos del backend ni usar `as`. `updateUser` incluye `name` con su valor actual porque el tipo del cliente exige un campo conocido.
- **`requiredRole` en vez de `role`:** Biome interpreta `role` en un componente como atributo ARIA y falla; se renombró la prop de `ProtectedRoute`. Es la única desviación de nombres respecto del contrato.
- **Registros corregidos:** `ROADMAP.md`, `AGENTS.md`, `HANDOFF.md` y `RESUMEN-PROYECTO.md` ya no describen auth mock ni guard pendiente; el roadmap marca la Etapa C cerrada y aclara que no hay más features planeadas.

**Validación:** backend 63/63 tests sin IA · backend `typecheck` 0 · frontend `build` 0 · lint raíz 0 (queda la warning preexistente de `Home.module.css:32`, fuera de este ticket). Falta: verificación de punta a punta en preview después del deploy (no se hizo push sin orden de Santiago).

## 5. ¿CON QUÉ SE HIZO? (Inventario Técnico y Auditoría)
<!-- Completado por 05-reviewer (2026-11-26) — APROBADO -->

**Estado: APROBADO.** Auditoría del diff completo contra el contrato de la Sección 2.

**Backend (6 archivos):**
- `db/schema.sql` — `"role" TEXT NOT NULL DEFAULT 'candidate'` en la tabla `"user"` (DBs nuevas).
- `db/seed.ts` — bloque `PRAGMA table_info("user")` + `ALTER TABLE ADD COLUMN` aditivo; corre dentro del `--schema-only` de T-004. Sin `DELETE`, `DROP` ni `UPDATE`.
- `auth.ts` — `user.additionalFields.role` (string, `defaultValue: candidate`, `transform.input` que fuerza a `candidate` cualquier valor raro).
- `types/index.ts` — `type UserRole = "candidate" | "recruiter"`.
- `middlewares/session.ts` — `normalizeRole()` (fail-safe), `getSessionIdentity()` (una sola consulta a Better Auth), más `getSessionUserId`/`getSessionUserRole` como helpers públicos.
- `services/jobsService.ts` — `ServiceError.forbidden` ahora lleva `message`; constante `forbiddenRole`; el chequeo `role !== "recruiter"` se aplica **antes** de `checkOwnership` en `create`, `update`, `partialUpdate` y `delete`.
- `controllers/jobs.ts` — `requireWriter()` reemplaza a `requireUserId` (401 sin sesión); pasa el rol al servicio y traduce el `message` del `forbidden` a 403.

**Frontend (8 archivos):** `types/api.ts` (`UserRole` + `getUserRole` sin `as`/`any`) · `Register.tsx` + `Auth.module.css` (casilla "Quiero publicar empleos") · `ProfilePage.tsx` + `.module.css` (info "Rol", botón de subida con `updateUser`, mensaje de error) · `UserMenu.tsx` ("Publicar empleo" solo recruiter) · `ProtectedRoute.tsx` (`requiredRole` → `/search`) · `App.tsx` (rutas de formulario con `requiredRole="recruiter"`).

**Tests:** `app.test.js` (+6 tests: 3 usuarios de test con rol, candidate 403 sin inserción, candidate sin editar/borrar, recruiter 201/200/204 con `userId`, ownership 403 con mensaje propio, lectura abierta, `update-user` con `role` → 201) · `migrate-schema.test.js` (+1: agrega `role` sin borrar filas, default `candidate`, idempotente en 2 corridas).

**Documentación:** `ROADMAP.md` (Etapa C cerrada + sección "cómo se completó"), `AGENTS.md` (secciones de escritura y auth), `HANDOFF.md` §4 (quitado el texto de auth mock/guard), `RESUMEN-PROYECTO.md` §5.

**Patrones/librerías:** Better Auth `additionalFields` + `transform` (sin plugins de admin ni tablas nuevas), servicio con códigos de dominio (capas intactas), migración aditiva por PRAGMA. Sin dependencias nuevas.

**QA confirmado:** `NODE_ENV=test npm test -- --test-skip-pattern="AI"` → **63/63** · backend `typecheck` 0 · frontend `build` 0 · lint raíz 0 (queda la warning preexistente `Home.module.css:32`, fuera del ticket).

**Notas menores (no bloquean):**
1. `getSessionUserRole` queda exportada por contrato pero hoy sin uso (la usan las escrituras vía `getSessionIdentity`). Se puede eliminar si se prefiere cero código muerto.
2. La prop de `ProtectedRoute` se llamó `requiredRole` en vez de `role` porque Biome la interpreta como atributo ARIA.
3. **Pendiente:** verificación manual en preview después del push (register con casilla, Perfil, publicación real con recruiter y 403 en la API con candidate). No se hizo push sin orden de Santiago.

## 6. TARJETA DE ENTREGA PARA TRELLO
<!-- Completado por 05-reviewer en lenguaje claro para el equipo/QA funcional -->

### Qué pasaba
Cualquier persona con cuenta podía publicar, editar y borrar empleos: no había diferencia entre quien busca trabajo y quien publica ofertas. El servidor dejaba pasar a cualquiera que tuviera sesión.

### Qué se hizo
Se agregaron dos roles: **candidate** (por defecto: solo busca y guarda favoritos) y **recruiter** (puede publicar y administrar sus propios empleos). El servidor valida el rol en cada acción de escritura antes de chequear que el empleo sea tuyo. En la interfaz: el registro tiene una casilla "Quiero publicar empleos", el Perfil muestra el rol y ofrece un botón para pasar de candidate a recruiter, y el botón "Publicar empleo" solo aparece para recruiter. Quien tenía cuenta antes queda como candidate y conserva sus empleos; con un clic en el Perfil vuelve a poder editarlos.

### Cómo probarlo (como usuario en la plataforma)
1. Entrá a `/register` **sin** marcar "Quiero publicar empleos" y creá la cuenta. → Entrás como Candidate.
2. Abrí el menú de cuenta (arriba a la derecha). → **No** aparece "Publicar empleo". Entrá a "Cuenta": dice **Rol: Candidate**.
3. Probá entrar directo a `/jobs/new`. → Te devuelve a la lista de empleos (no podés publicar).
4. En el Perfil, apretá **"Quiero publicar empleos"**. → El rol cambia a **Recruiter** y en el menú aparece "Publicar empleo".
5. Publicá un empleo nuevo con ese usuario. → Se crea correctamente y en el Perfil/Detail figura como tuyo; podés editarlo y borrarlo.
6. Creá una segunda cuenta **con** la casilla marcada desde el registro y publicá desde el menú. → Funciona directo.
7. (QA técnico) Con sesión de candidate, `POST /jobs` contra la API. → `403` con "Se necesita rol recruiter para publicar empleos" y no se guarda nada.

**Nota:** los datos de prueba de roles están en `backend/app.test.js` (suite completa en verde, 63/63 sin IA).
