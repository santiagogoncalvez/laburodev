# TICKET: T-003 - Pulido de UI y corrección de formulario de empleos

## Tipo
BUG

## Origen
- [x] Bug report de usuario final (pruebas manuales post T-002)

## Descripción (Libre)
Tras completar la Etapa B (CRUD de empleos por propietario), las pruebas manuales detectaron 5 problemas de UI/UX y persisitencia:

1. **La descripción no se guarda ni persiste**: El formulario enviaba `description` arriba del todo pero el modelo backend persiste `content.description` (la sección `content` incluye `description`, `responsibilities`, `requirements`, `about`). Además faltaban inputs para completar los campos opcionales de `content`.
2. **Estilo inconsistente del textarea de descripción**: Aparecía gris y con tipografía mono, diferente a los `<input>` del formulario.
3. **La edición no precarga los valores actuales**: Aparecía todo de cero (vacío) al editar porque se intentaba manipular el DOM antes de que el formulario existiera (`loading: true`) y se usaban `name` con `useId`. Debe usarse un formulario controlado por estado React.
4. **Alerta de navegador al eliminar**: Salía `window.alert` nativa de JS. Se requiere eliminación directa sin alerta al presionar el botón rojo.
5. **Pantalla de detalle ante 404**: Al recargar una pestaña de un empleo que fue eliminado, el backend responde 404 pero la pantalla de detalle debe mostrar un estado "Empleo no encontrado" claro con acceso a la búsqueda.

## Contexto Adicional (Opcional)
- Pantalla/URL afectada: `/jobs/new`, `/jobs/:jobId/edit`, `/jobs/:jobId`
- Usuario reportante: Santiago (manual QA)
- Prioridad percibida: Alta
