# ESTADO ACTUAL DEL SISTEMA

- **Ticket Activo:** T-004 (`tickets/todo/T-004-migracion-automatica-db-ci.md`) — migración automática de esquema en CI + separación migrate/seed
- **Piloto SDD:** CERRADO y mergeado a `development` (`9f11172`); rama `spike/sena-sdd` subida al remoto como registro
- **Fase Actual:** SDD T-004 — **LISTO_PARA_COMMIT**. Contrato aprobado, 03-tester (RED 54/6) → 04-implementador (GREEN 60/60) → 05-reviewer **APROBADO** (mismo modelo, Santiago lo confirmó). Typecheck, lint y frontend build OK. Escenario 4 verificado en preview: `POST /api/jobs` → 201.
- **Pendiente externo:** cargar 4 secrets en GitHub (`TURSO_DATABASE_URL_DEV`, `TURSO_AUTH_TOKEN_DEV`, `TURSO_DATABASE_URL_PROD`, `TURSO_AUTH_TOKEN_PROD`) ANTES de pushear; Santiago ejecuta commit/push a `development`. `main` intacto.

## Última Acción Registrada
Coordinador: T-004 cerrado. Fix inmediato aplicado (`npm run db:migrate:dev` agregó `user_id` en Turso dev sin borrar datos); `/health` OK, `/jobs` 200 y POST con sesión → 201 en la preview. El CI ya migra antes del deploy en dev y prod, sin seed/reset automáticos. Documentación y expediente actualizados. Commit sugerido: `fix(db): migra el esquema antes de cada deploy y separa migrate del seed`. Solo Santiago ejecuta `git commit` / `git push`.
