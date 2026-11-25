# TICKET: T-004 - Migración automática de esquema en CI y separación migrate/seed

## Tipo
FEATURE (incluye bugfix inmediato)

## Origen
- [x] Bug report de usuario final (500 en preview al publicar empleo, 2026-11-23)
- [x] Request no técnico (automatizar la actualización de la base remota en los deploys)

## Descripción (Libre)

### Problema
Al pushear el merge de `development` (Etapa B: CRUD por propietario), la preview
(`laburodev-api-dev.vercel.app`) desplegó código nuevo pero la Turso dev nunca se
migró. Resultado: `POST /api/jobs` falla con 500 y `SQLite error: table jobs has no
column named user_id`.

**Causa raíz (verificada leyendo `.github/workflows/ci.yml`):** el workflow de CI
**nunca toca Turso**. El único paso "Seed Database" siembra un SQLite local efímero
para los tests. No existe ningún paso que migre la base remota en la preview ni en
producción. Lo que había quedado planeado ("que el deploy de la rama actualice la
base remota") nunca se implementó.

### Decisiones ya tomadas con Santiago (aprobadas)
1. **Automatizar en CI:** cada deploy corre la migración de esquema *antes* de
   desplegar el código nuevo. Si el migrate falla, no se deployea nada.
   - Job `preview-backend` (push a `development`): primer paso `npm run db:migrate:dev`.
   - Job `deploy-backend` (push a `main`): primer paso `npm run db:migrate:prod`.
2. **Separar "migrar esquema" de "sembrar datos":** agregar flag `--schema-only` a
   `seed.ts` (esquema + PRAGMA de columnas + índices, **sin** `DELETE FROM jobs`).
   Este es el comando que corre el CI.
3. **Regla por ambiente:**
   - **Desarrollo:** migrate automático en cada push; seed/reset manual cuando se
     quiera dataset fresco (`db:seed` / `db:reset`). Cambios destructivos de esquema
     a mano (SQL o reset), porque no hay datos reales.
   - **Producción:** solo migrate automático (aditivo, jamás borra datos).
     Seed/reset **nunca** automático. Cambios destructivos con script planeado +
     respaldo, una vez, documentado.
4. **Secretos en GitHub:** `TURSO_DATABASE_URL_DEV`, `TURSO_AUTH_TOKEN_DEV`,
   `TURSO_DATABASE_URL_PROD`, `TURSO_AUTH_TOKEN_PROD` como repository secrets
   (valores desde `backend/.env`, sin exponerlos).
5. **Documentar la regla** en `AGENTS.md` y `FLUJO-TRABAJO.md`.
6. **Fix inmediato (paso 0):** correr `npm run db:migrate:dev` una vez para
   desbloquear la preview hoy (agrega `user_id` sin borrar datos).

### Limitación técnica a documentar
SQLite/Turso solo soporta `ALTER TABLE` aditivo de forma nativa. Los destructivos
requieren rebuild de tabla. El migrate automático cubre aditivos (el 95%); los
destructivos quedan manuales: directos en dev, planeados en prod.

## Contexto Adicional (Opcional)
- Pantalla/URL afectada: `laburodev-api-dev.vercel.app/api/jobs` (preview) ·
  producción `laburodev-api.santiagogoncalvez.com`
- Usuario reportante: Santiago (prueba manual de publicación en preview)
- Prioridad percibida: Alta (bloquea la prueba de la Etapa B en preview)
- Adjuntos: log de Vercel con `LibsqlError: SQLITE_UNKNOWN: SQLite error: table jobs
  has no column named user_id` (requestId `rxmtc-1795466112988-8fe719cf4f99`)

### Archivos a tocar (borrador, lo refine el arquitecto)
- `backend/db/seed.ts` — flag `--schema-only`
- `backend/package.json` — scripts `db:migrate`, `db:migrate:dev`, `db:migrate:prod`
- `.github/workflows/ci.yml` — pasos de migrate antes de cada deploy
- `AGENTS.md` y `FLUJO-TRABAJO.md` — reglas dev/prod
- Secrets de GitHub (fuera del repo)

### Criterios de éxito
- [ ] Publicar un empleo en la preview funciona tras el push (sin 500).
- [ ] `db:migrate:dev` agrega columnas faltantes sin borrar empleos existentes.
- [ ] En Actions se ve el paso de migrate antes del deploy en `preview-backend`.
- [ ] `deploy-backend` tiene el paso de migrate con secrets `_PROD`.
- [ ] typecheck backend/frontend, lint raíz y tests backend en verde.
- [ ] Reglas documentadas en AGENTS.md y FLUJO-TRABAJO.md.
