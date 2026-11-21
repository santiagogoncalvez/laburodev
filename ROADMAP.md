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
- [x] Migración de Auth (módulos mock de Zustand a auth real) — **Etapa A** completada: Better Auth email+password, sesiones con cookies mismo origen, favoritos sincronizados con el server.
- [x] **Etapa B — CRUD de empleos por propietario** completada (2026-11-21): autorización por sesión + ownership en POST/PUT/PATCH/DELETE `/jobs` (401/403/404), `x-api-key` removido de las rutas (guard archivado para Fase 3 con roles), alias same-origin `/api/jobs`, formulario crear/editar (`/jobs/new`, `/jobs/:jobId/edit`) controlado por estado con campos de `content`, botones de dueño en Detail, eliminación directa y pantalla 404 amigable. Detalle: `memory/T-002-etapa-b-crud-propietario.md` y `memory/T-003-pulido-ui-formulario-empleos.md`.
- [ ] **Etapa C — Roles (recruiter/candidate)**, verificación de email y reactivación de `writeGuard` sobre el CRUD.
- [ ] Implementación de RLS / Permisos en Turso/Postgres.

## BACKLOG CONDICIONADO (solo si aplica el gatillo)
- [ ] **Migrar a npm workspaces** (1 lockfile en la raíz, instalación única, `typescript`/`@types/node` deduplicados). **Gatillo**: cuando exista código compartido real (`packages/shared` con tipos/utils) — sin eso no paga el costo (hoy el único beneficio serían ~40 MB de disco). Al migrar: rehacer install + cache en los 2 jobs de CI, `Dockerfile.vercel` (contexto → raíz + COPY de los 3 `package.json`), verificar preview en Vercel (`rootDirectory` por proyecto + lockfile en raíz) — todo sobre rama. **Turborepo**: solo si hay 5+ paquetes y el CI se pone lento; a esta escala, nunca.

---

> **Nota (2026-11-13):** Rama `development` configurada para CI. Los deploys a Vercel solo ocurren en `main`.
> **Nota (2026-11-14):** Preview URLs fijas configuradas: `laburodev-dev.vercel.app` (frontend) y `laburodev-api-dev.vercel.app` (backend). Alias creados via REST API en CI.
> **Nota (2026-11-21):** Etapa B + pulido T-003 completados en la rama `spike/sena-sdd` (piloto del framework SDD sena-sdd). Pendiente: merge a `development` cuando cierre el piloto.
