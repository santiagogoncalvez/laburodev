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
- [ ] Migración de Auth (módulos mock de Zustand a auth real).
- [ ] Implementación de RLS / Permisos en Turso/Postgres.

## BACKLOG CONDICIONADO (solo si aplica el gatillo)
- [ ] **Migrar a npm workspaces** (1 lockfile en la raíz, instalación única, `typescript`/`@types/node` deduplicados). **Gatillo**: cuando exista código compartido real (`packages/shared` con tipos/utils) — sin eso no paga el costo (hoy el único beneficio serían ~40 MB de disco). Al migrar: rehacer install + cache en los 2 jobs de CI, `Dockerfile.vercel` (contexto → raíz + COPY de los 3 `package.json`), verificar preview en Vercel (`rootDirectory` por proyecto + lockfile en raíz) — todo sobre rama. **Turborepo**: solo si hay 5+ paquetes y el CI se pone lento; a esta escala, nunca.

---

> **Nota (2026-11-13):** Rama `development` configurada para CI. Los deploys a Vercel solo ocurren en `main`.
