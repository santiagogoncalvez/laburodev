# TICKET: T-005 - Etapa C: roles y permisos de publicación

## Tipo
FEATURE

## Origen
- [x] Request no técnico de Santiago (2026-11-26): seguir con la parte tres del plan de autenticación/autorización, ya que A y B están aplicadas; usar el flujo sena-sdd por ser un grupo grande; adaptar el grupo a lo que realmente quedó después de A y B.
- [x] `ROADMAP.md` → FASE 3, Etapa C: "Roles (recruiter/candidate), verificación de email y RLS / Permisos en Turso/Postgres".

## Descripción (Libre)
Hoy cualquier persona con sesión puede publicar, editar y borrar empleos. Falta distinguir quién busca trabajo (candidate) de quién publica ofertas (recruiter), y que el servidor haga valer esa diferencia. Según lo acordado el 2026-11-26, **el alcance es solo roles + permisos**: la verificación de email queda fuera. Después de este grupo no se agregan más features, solo pulido general.

La base escrita en el roadmap quedó desactualizada: el guard `x-api-key` ya se removió en la Etapa B, el auth mock ya no existe (hay Better Auth real), el ownership por `user_id` ya está implementado y la base ahora se migra sola antes de cada deploy (T-004). El contrato del ticket debe adaptarse a esa realidad, no a la del plan original.

## Contexto Adicional
- Prioridad: siguiente grupo del plan. Rama de trabajo: `development`. `main` intacto.
- Errores de preview que reportó Santiago: eran los del 500 por `user_id`, ya resueltos en T-004 (CI verde y `/jobs` 200). No requieren otro ticket.
- Registros leídos: `ROADMAP.md`, `AGENTS.md`, `FLUJO-TRABAJO.md`, `HANDOFF.md`, `RESUMEN-PROYECTO.md`, `memory/T-002` y `memory/T-004`.
