# TICKET: T-002 - Etapa B: CRUD de Empleos por Propietario

## Tipo
FEATURE

## Origen
- [x] Historia de Usuario (Formato: *Como [rol] quiero [acción] para [beneficio]*)
- [ ] Ticket informal de Trello/Jira (copia-pega libre)
- [ ] Request no técnico (ej. "El login a veces no anda", "Agregar botón exportar")
- [ ] Bug report de usuario final

**Historia:** Como usuario autenticado, quiero crear, editar y eliminar mis propios empleos, para gestionar mis publicaciones sin intervención administrativa. Solo el dueño ve los botones de edición/eliminación.

## Descripción (Libre)
Lee ROADMAP.md (FASE 3) y AGENTS.md. Completar la Etapa B: CRUD de Empleos por Propietario.

**Objetivo:** Que un usuario autenticado pueda crear, editar y eliminar sus propios empleos, y que solo el dueño vea los botones de edición/eliminación. Reemplazar el guard temporal x-api-key por autorización basada en sesión.

**Contexto de la Etapa A (ya completada):**
- Better Auth email+password funcionando con Turso/SQLite
- Sesiones con cookies de mismo origen
- middlewares/session.ts expone getSessionUserId(req) → string | null
- Esquema user/session/account/verification ya creado
- favorites como ejemplo de rutas protegidas

**Decisiones ya tomadas (respetar):**
- Registro solo email + contraseña (sin username, sin nombre completo)
- Sin roles todavía (recruiter/candidate es Etapa C)
- Sin verificación de email
- Minimalismo: todo simple, después

**Tareas:**

1. **Esquema DB:** Agregar columna user_id (TEXT, nullable) a la tabla jobs en db/schema.sql. Los empleos existentes del seed quedan sin user_id (nullable = nadie puede editarlos, solo leerlos).

2. **Backend — Servicio de creación:** Modificar POST /jobs para que:
   - Requiera sesión válida (getSessionUserId)
   - Asigne user_id automáticamente al crear el empleo
   - Responda 401 si no hay sesión
   - Mantener el validador Zod existente (agregar user_id como opcional en la entrada, pero que el servidor lo asigne, no el cliente)

3. **Backend — Modificación/eliminación:** Modificar PUT /jobs/:id y DELETE /jobs/:id para que:
   - Requieran sesión válida
   - Verifiquen que job.user_id === session.userId (solo el dueño)
   - Responda 403 si no es el dueño
   - Responda 404 si el empleo no existe
   - Los empleos sin user_id (seed) no se pueden editar/eliminar (403)

4. **Backend — Remover x-api-key:** Eliminar el middleware writeGuard de las rutas de jobs. Mantener el archivo writeGuard.ts por si se necesita en la Fase 3 (roles), pero desactivarlo de las rutas.

5. **Frontend — Crear empleo:** Crear ruta /jobs/new con formulario de creación. Visible solo para usuarios autenticados. Sin sesión → redirect a /login.

6. **Frontend — Editar/Eliminar empleo:** En Detail.tsx, mostrar botones de "Editar" y "Eliminar" solo si session.userId === job.userId. Editar navega a /jobs/:id/edit.

7. **Frontend — Protección de rutas:** /jobs/new y /jobs/:id/edit verifican sesión en el componente. Sin sesión → redirect a /login.

8. **Seed:** Los empleos del seed quedan sin user_id (son "públicos", solo lectura). No modificar el seed existente.

**Validación obligatoria:**
- npm run typecheck en backend y frontend
- npm run lint desde la raíz
- npm test en backend (con NODE_ENV=test)
- Verificar que los tests existentes sigan pasando

**Al terminar:**
- Actualizar ROADMAP.md marcando Etapa B como completada con detalle de cambios
- Actualizar AGENTS.md si cambió la sección de auth o escritura protegida
- Invocar @super-commit para hacer los commits atómicos

## Contexto Adicional (Opcional)
- Restricciones: Trabajar en development* · Anunciar cada cambio antes de hacerlo · No tocar main · No agregar roles · No agregar verificación de email · Minimalismo
  - *(Nota: el piloto SDD corre en `spike/sena-sdd`; el merge a `development` se decide al cerrar el piloto)*
- Prioridad: alta (siguiente etapa del ROADMAP Fase 3)
