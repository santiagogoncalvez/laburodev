# ESTADO ACTUAL DEL SISTEMA

- **Ticket Activo:** T-005 (`tickets/todo/T-005-roles-permisos.md`) — Etapa C: roles (candidate/recruiter) y permisos de publicación
- **Piloto SDD:** CERRADO y mergeado a `development` (`9f11172`)
- **T-004:** CERRADO y pusheado (`c4d42aa`). CI verde; preview OK.
- **Fase Actual:** SDD T-005 — **LISTO_PARA_COMMIT**. Pipeline completo: Coordinador → 02-arquitecto (contrato aprobado por Santiago) → 03-tester (RED) → 04-implementador (GREEN 63/63) → pausa anti-sesgo (mismo modelo, confirmado) → 05-reviewer **APROBADO** (secciones 5 y 6 completadas). Sin commit ni push.
- **Alcance acordado:** solo roles + permisos; verificación de email fuera. No quedan más features planeadas después de C.
- **Pendiente post-push:** verificación manual en preview (register con casilla, Perfil, publicación recruiter, 403 en API con candidate).

## Última Acción Registrada
05-reviewer: audió el diff completo (capas, sin `any`/`console.log` nuevos, invariante de migrate intacto), cerró el expediente y redactó la tarjeta de entrega. Mensaje de commit sugerido entregado a Santiago; solo él decide commit/push. Archivos a excluir del commit: `.agents/`, `.claude/`, `RESUMEN-PROYECTO.md`, `skills-lock.json`, `super-commit/`.
