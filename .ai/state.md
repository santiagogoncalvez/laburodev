# ESTADO ACTUAL DEL SISTEMA

- **Ticket Activo:** T-005 (`tickets/todo/T-005-roles-permisos.md`) — Etapa C: roles (candidate/recruiter) y permisos de publicación — **CERRADO**
- **Piloto SDD:** CERRADO y mergeado a `development` (`9f11172`)
- **T-004:** CERRADO y pusheado (`c4d42aa`). CI verde; preview OK.
- **T-005:** CERRADO y pusheado (`8cb7748`). Pipeline SDD completo (coordinador → arquitecto → tester RED → implementador GREEN → anti-sesgo → reviewer APROBADO). CI verde (incluye `db:migrate:dev` con la columna `role` en Turso dev). Verificación manual local y en preview OK: registro con casilla, candidate recibe 403 con mensaje claro, upgrade a recruiter vía `update-user`, recruiter publica (201) y borra (204).
- **Fase Actual:** SIN TICKETS PENDIENTES. No quedan features planeadas después de la Etapa C; siguiente interés de Santiago: base de datos propia (fuera del piloto SDD por ahora).
- **Pendiente recordar:** secrets de GitHub (`TURSO_DATABASE_URL_DEV/_PROD`, `TURSO_AUTH_TOKEN_DEV/_PROD`) — el CI pasó el paso migrate, así que los de dev cargan OK; verificar los de prod antes del merge a `main`.

## Última Acción Registrada
T-005 commiteado y pusheado (`8cb7748`, autorizado por Santiago), CI verde y verificación remota completada con el test de 403 en preview. El flujo SDD de este ticket terminó en el cierre.
