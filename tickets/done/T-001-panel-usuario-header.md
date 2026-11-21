# TICKET: T-001 - Panel de usuario en el header (reemplaza enlace "Perfil")

## Tipo
UI / CHORE

## Origen
- [ ] Historia de Usuario (Formato: *Como [rol] quiero [acción] para [beneficio]*)
- [ ] Ticket informal de Trello/Jira (copia-pega libre)
- [x] Request no técnico (ej. "El login a veces no anda", "Agregar botón exportar")
- [ ] Bug report de usuario final

## Descripción (Libre)
Cuando un usuario está logueado, hoy aparece un enlace de texto "Perfil" en el header. Quiero reemplazarlo por un **icono de usuario** (lucide-react, estilo minimalista) ubicado al lado del icono de tema (switch de dark/light mode). Al hacer click en el icono de usuario se abre un **panel desplegable** con dos opciones:

1. **Cuenta** → navega a `/profile`
2. **Cerrar sesión** → cierra la sesión (Better Auth) y vuelve al estado de invitado

Estilo tipo menú desplegable "HP": le das al botón con icono de usuario y se despliega el panel. Cuando el usuario NO tiene sesión, no se muestra ni el icono ni el panel (mantener el acceso normal al login como está hoy).

## Contexto Adicional (Opcional)
- Pantalla/URL afectada: header/nav en todas las rutas
- Diseño: respetar `frontend/DESIGN-SYSTEM.md` (tokens, Bricolage Grotesque, lucide-react, cero emoji, minimalista)
- El estado de sesión ya existe: Better Auth `useSession` (Fase 1)
- Cerrar sesión: cliente Better Auth en `src/lib/auth-client.ts`
- Prioridad percibida: baja (mejora de UX)
