# Roadmap: laburoDev Fullstack Evolution

## FASE 1: Estabilización y DX (Post-Migración)
- [x] Configuración de Path Aliases (`@/*`) en `tsconfig.json` (Front y Back).
- [x] Lint estricto con Biome 2.6 (reemplaza ESLint: TS7 no expone API programática a typescript-eslint) y ordenamiento de imports.
- [x] Limpieza de `PENDING_FIXES.md` (Resolución de errores de lógica post-migración).

## FASE 2: Testing y Contratos de Datos
- [ ] Automatización de CI con `typecheck` y tests E2E con agente (`npm run test:ai`).
- [x] Refactor de controladores backend a capa de servicios pura (0 lógica de DB/Zod directa en controllers).
- [x] Verificación de middleware `writeGuard` (`x-api-key`) en todos los endpoints de modificación de empleos.

## FASE 3: Autenticación Real y Persistencia (Roadmap Futuro)

> **Proceso de registro de usuario y autorización** — cada etapa se marca acá con su detalle de ejecución. Este bloque es la fuente de verdad de lo ya hecho: las etapas siguientes deben leerlo (junto con `AGENTS.md`) antes de arrancar.

- [x] **Etapa A · Migración de Auth** (email+password + favoritos en DB) — completada 2026-11-19, detalle abajo.
- [x] **Etapa B · CRUD de empleos por propietario** — completada 2026-11-21, detalle abajo.
- [ ] **Etapa C · Roles (recruiter/candidate), verificación de email y RLS / Permisos en Turso/Postgres** — la definición exacta de cada etapa siguiente se acuerda al empezarla.

### Etapa A — cómo se completó (2026-11-19)

**Base entregada por el plan:** Better Auth email+password con Turso/libSQL · esquema `user/session/account/verification` salido de `getMigrations()` · handler montado antes de `express.json()` · sesión con cookies de mismo origen (proxy Vite en dev / rewrite en Vercel) · favoritos persistidos en DB con sesión real · mock `authStore` de Zustand eliminado.

**Diferencias, modificaciones y customizaciones vs la base de la etapa:**

1. **Registro solo email + contraseña** — se eliminó el campo "Nombre completo" del formulario; `name` se deriva de `email.split('@')[0]` (Better Auth lo exige como campo) y queda editable para el Perfil en el futuro.
2. **Sin "nombre de usuario"** — el identificador único es el email (login "usuario o correo" = complejidad sin ganancia). El plugin `username` de Better Auth queda para etapas siguientes si se necesita.
3. **Sin editor de nombre en el Perfil** por ahora (minimalismo: "todo simple, después").
4. **Favoritos con puerta de login (modelo A)** — decisión de producto tomada en la etapa, distinta de la base (que preveía favoritos de invitado en localStorage con merge libre):
   - Sin sesión, el corazón abre `FavoriteLoginModal` (CTA principal a `/register`, secundario a `/login`); al autenticarse **el favorito pendiente se guarda solo**.
   - El invitado solo puede des-marcar favoritos heredados del flujo local anterior (legacy); no puede agregar nuevos.
   - Se mantiene el merge local ∪ servidor al iniciar sesión (reclama la lista previa); `sessionReady` evita modal falso durante la carga de sesión.
   - `DESIGN-SYSTEM.md` actualizado (decía "sin puerta de login hasta auth real").
5. **`vercel.json` con rewrite por host** (patrón documentado por Vercel): `laburodev-dev.vercel.app` → API dev; el resto → API prod. Un solo archivo en ambas ramas (cero conflicto de merge). No se pueden usar env vars dentro de `vercel.json`.
6. **`db:seed:dev`** nuevo (espejo de `db:seed:prod` con claves `_DEV`): siembra la Turso de preview sin duplicar jobs.
7. **Docker `node:24-slim` en vez de `node:24-alpine`** — el binario musl viejo de `@libsql/*` anidado no carga en alpine (`ERR_DLOPEN_FAILED` / `fcntl64: symbol not found`).
8. **CI**: smoke con espera activa de `/health` (30×2s), chequeo con `docker inspect` (el filtro por nombre no matcheaba), `-e BETTER_AUTH_URL` en el contenedor y logs en cada rama de fallo.
9. **Env vars**: scope **Preview** seteado (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`, `VITE_API_URL`, `WRITE_API_KEY`). **Scope Production pendiente antes del merge a `main`** (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` de prod, `FRONTEND_URL` con orígenes prod).

**Validación:** typecheck/lint/build en verde · tests backend 47/47 · CI verde · preview verificado de punta a punta (health, `/jobs` total=58, rewrite de auth con registro real + cookie de sesión).

### Etapa B — cómo se completó (2026-11-21)

**Base entregada:** autorización por sesión + ownership en POST/PUT/PATCH/DELETE `/jobs` (401 sin sesión, 403 si no es dueño, 404 si no existe) · columna `jobs.user_id TEXT NULL` asignada por el servidor (nullable = empleos del seed de solo lectura) · `x-api-key` removido de las rutas (`writeGuard` archivado para la Etapa C con roles) · alias same-origin `/api/jobs` para que la cookie viaje · frontend con formulario crear/editar controlado por estado (`/jobs/new`, `/jobs/:jobId/edit`), campos de `content` (descripción, responsabilidades, requisitos, about), botones de dueño en Detail, eliminación directa sin alertas y pantalla 404 amigable.

**Diferencias vs la base del ticket:** PATCH también pasó por ownership (cerraba un hueco de seguridad) · el validador Zod quedó sin cambios (strippea cualquier `user_id` que mande el cliente) · sin FK en `user_id` (los empleos del seed no tienen usuario) · se corrigió el mapeo de `content` en el formulario y la precarga en edición tras la prueba manual (ticket T-003).

**Validación:** typecheck backend/frontend en verde · lint raíz en verde · tests backend 53/53 · prueba manual de punta a punta aprobada (publicar, editar con precarga, eliminar, 404).

**Seguimiento:** este trabajo se hizo con el piloto del framework SDD [sena-sdd](https://github.com/niic0o/sena-sdd) en la rama `spike/sena-sdd` (tickets T-001 a T-003, expedientes en `memory/`). Ver `AGENTS.md` → "Flujo de tickets SDD".

## BACKLOG CONDICIONADO (solo si aplica el gatillo)
- [ ] **Migrar a npm workspaces** (1 lockfile en la raíz, instalación única, `typescript`/`@types/node` deduplicados). **Gatillo**: cuando exista código compartido real (`packages/shared` con tipos/utils) — sin eso no paga el costo (hoy el único beneficio serían ~40 MB de disco). Al migrar: rehacer install + cache en los 2 jobs de CI, `Dockerfile.vercel` (contexto → raíz + COPY de los 3 `package.json`), verificar preview en Vercel (`rootDirectory` por proyecto + lockfile en raíz) — todo sobre rama. **Turborepo**: solo si hay 5+ paquetes y el CI se pone lento; a esta escala, nunca.

---

> **Nota (2026-11-13):** Rama `development` configurada para CI. Los deploys a Vercel solo ocurren en `main`.
> **Nota (2026-11-14):** Preview URLs fijas configuradas: `laburodev-dev.vercel.app` (frontend) y `laburodev-api-dev.vercel.app` (backend). Alias creados via REST API en CI.
> **Nota (2026-11-21):** Etapa B + pulido T-003 completados con el piloto SDD, integrados a `development` desde `spike/sena-sdd` (rama subida al remoto como registro del aprendizaje).
