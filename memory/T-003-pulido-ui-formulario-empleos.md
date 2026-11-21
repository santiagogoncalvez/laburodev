# EXPEDIENTE: T-003 - Pulido de UI y corrección de formulario de empleos

- **Fecha:** 2026-11-21
- **Categoría (Triage):** BUGFIX
- **Estado:** ESPERANDO_APROBACION

## 1. ¿PARA QUÉ SE HIZO? (Contexto y Ruta de Trabajo)
<!-- Completado por el Coordinador -->
- **Problema o Necesidad de Negocio:** Tras completar el CRUD por propietario en la Etapa B (T-002), las pruebas manuales detectaron 5 fallas de UX/persistencia: la descripción no se guarda en `content`, el textarea tiene estilos inconsistentes, la edición no precarga valores (aparece vacía), la eliminación lanza una alerta `window.confirm` de navegador, y la recarga de un empleo borrado muestra un error sin UI amigable de 404.
- **Resultado Esperado:** Un formulario controlado por estado React que persiste la sección `content` completa (`description`, `responsibilities`, `requirements`, `about`), precarga los valores en edición, unifica los estilos de textarea con input, elimina de forma directa al tocar el botón rojo y presenta una pantalla 404 limpia cuando un empleo no existe.
- **Pipeline de Agentes Asignado:**
  - [x] Paso 1: Coordinador + 01-investigador / 02-arquitecto - Triage BUG, Diagnóstico y Contrato de Sección 2.
  - [ ] Paso 2: Santiago - Pausa de aprobación explícita del contrato T-003.
  - [ ] Paso 3: 04-implementador - Aplicación de fixes en frontend (`JobFormPage`, `Detail`, `jobsApi`, `Auth.module.css`) y verificación backend.
  - [ ] Paso 4: Validaciones obligatorias (`typecheck` backend/frontend, `lint` raíz, `npm test`).
  - [ ] Paso 5: 05-reviewer - Pausa anti-sesgo → Auditoría -> Sección 5 y 6.
  - [ ] Paso 6: Santiago - Prueba manual final → Cierre del piloto + Commits atómicos + Evaluación del framework SDD.

## 2. CONTRATO TÉCNICO Y PLAN DE ARCHIVOS (La Especificación para el Implementador)
<!-- Completado por 01-investigador y 02-arquitecto -->

### Diagnóstico de Causa Raíz por punto:

1. **Persistencia de `description` y sección `content`:**
   - *Causa:* `JobFormPage` enviaba `description` en el nivel superior del JSON (`input.description`). Pero `backend/models/jobs.ts` extrae `description` exclusivamente de `content ?? {}` (`content.description`). El valor del nivel superior se descartaba en la consulta SQL.
   - *Contrato:* `JobFormInput` en `frontend/src/lib/jobsApi.ts` debe enviar la sección `content: { description, responsibilities, requirements, about }`. El formulario expondrá campos para `description`, `responsibilities` (separadas por coma), `requirements` (separadas por coma) y `about`.
   - *Transformación en frontend:* Las cadenas de comas se convierten a `string[]` en el submit; al precargar, los arreglos se unen con `join(', ')`.

2. **Estilos de textarea:**
   - *Causa:* `<textarea className={styles.input}>` heredaba reglas por defecto del navegador para font (`mono`) y background gris sin override explícito en `Auth.module.css`.
   - *Contrato:* Agregar regla explícita en `Auth.module.css` para `textarea.input`: `background-color: var(--surface)`, `color: var(--text-1)`, `font-family: inherit`, `resize: vertical`.

3. **Edición sin precarga (vacía):**
   - *Causa:* `JobFormPage` usaba manipulación imperativa del DOM (`prefillForm` con `document.getElementById`) que se ejecutaba mientras `loading` era `true` (cuando el formulario aún no estaba montado en el DOM).
   - *Contrato:* Reescribir `JobFormPage` como un **formulario controlado por estado React**: `const [formData, setFormData] = useState<JobFormState>(...)`. Al recibir el JSON del empleo en edición, se setea `formData` de una vez y React renderiza los valores iniciales nativamente en `value` de cada input.

4. **Eliminación sin `window.confirm`:**
   - *Causa:* `Detail.tsx` llamaba a `window.confirm(...)`.
   - *Contrato:* Eliminar la llamada a `window.confirm`. El handler `handleDelete` ejecuta directamente `deleteJob(job.id)` y redirige a `/search`.

5. **Pantalla 404 amigable en Detail:**
   - *Causa:* Al recibir 404 en GET `/api/jobs/:id`, `Detail.tsx` mostraba un mensaje de error crudo sin acciones claras.
   - *Contrato:* Detectar status 404 (o `notFound: true`) y renderizar una tarjeta de error amigable: título *"Empleo no encontrado"*, mensaje *"El empleo que buscás no existe o fue eliminado"* y un botón *"Volver a la búsqueda"* hacia `/search`.

### Archivos a modificar:
- `frontend/src/lib/jobsApi.ts`: actualizar interfaz `JobFormInput` y `updateJob`/`createJob`.
- `frontend/src/pages/JobFormPage.tsx`: refactor a form controlado con estado React y campos para `content`.
- `frontend/src/pages/Auth.module.css`: regla para `textarea.input`.
- `frontend/src/pages/Detail.tsx`: quitar `window.confirm` + estado 404 amigable.

### Invariantes y Reglas de Negocio:
- Los empleos del seed siguen sin poder editarse ni borrarse (403 del servidor).
- No se rompen los validadores Zod del backend.
- Cero `window.alert` o `window.confirm`.

## 3. REGISTRO DE PRUEBAS (QA Automation)
<!-- Completado por 03-tester -->

## 4. ¿POR QUÉ SE HIZO ASÍ? (Decisiones Técnicas de Implementación)
<!-- Completado por 04-implementador tras pasar los tests a VERDE -->

- **Formulario controlado por estado (no DOM imperative):** `JobFormPage` ahora tiene un `useState<JobFormState>` como única fuente de verdad. En edición, el GET del empleo hace `setForm(...)` una vez y React precarga todos los inputs. Se eliminó `prefillForm` (que fallaba porque tocaba el DOM antes de montar el form y usaba `name` con `useId`).
- **Todo el texto vive en `content`:** `JobFormInput` ya no tiene `description` top-level — el backend solo persiste `content.description/responsibilities/requirements/about` (ver `models/jobs.ts`). Responsabilidades y requisitos viajan como `string[]` (se convierten con `toList`/`toText` al enviar/precargar).
- **Textarea idéntico al input:** clase `.textarea` en `Auth.module.css` replica exactamente las reglas globales de `input[type=text]` (bg-soft, sin borde, font inherit) — el navegador pintaba los textareas con su fondo gris y font mono por defecto porque no había regla que los cubriera.
- **Eliminación directa:** quitado `window.confirm` (nunca alertas de navegador). El botón rojo ejecuta `deleteJob` de una y navega a `/search`; si falla, muestra el error inline en el componente.
- **404 amigable en Detail:** `response.status === 404` setea un flag `notFound` que renderiza una tarjeta "Empleo no encontrado" con botón "Volver a la búsqueda" (`/search`). Antes navegaba a `/not-found` (ruta inexistente que caía en el `*` genérico) y los demás errores quedaban mezclados con el 404.
- **`window.confirm`/`window.alert`:** cero en el código (invariante del contrato).

## 5. ¿CON QUÉ SE HIZO? (Inventario Técnico y Auditoría)
<!-- Completado por 05-reviewer -->
- **Estado de Auditoría:** `APROBADO`
- **Inventario de archivos modificados:**
  - `frontend/src/lib/jobsApi.ts` (modificado): `JobFormInput` sin `description` top-level; `content` ahora obligatorio con `description/responsibilities/requirements/about`.
  - `frontend/src/pages/JobFormPage.tsx` (reescrito): formulario controlado por `useState<JobFormState>`; nuevos campos para `responsibilities`, `requirements` y `about`; `handleChange` genérico para input/textarea/select; precarga real vía `setForm` en edición; sin manipulación del DOM.
  - `frontend/src/pages/Auth.module.css` (modificado): clase `.textarea` que replica las reglas globales de `input[type=text]` (bg-soft, sin borde, font inherit) + `.textarea::placeholder`.
  - `frontend/src/pages/Detail.tsx` (modificado): eliminado `window.confirm` (eliminación directa); flag `notFound` con tarjeta amigable "Empleo no encontrado" + botón "Volver a la búsqueda" (`/search`); errores de red separados del caso 404.
- **Verificación QA:**
  - `npm run typecheck` en `backend/`: PASS (0 errores)
  - `npm run typecheck` en `frontend/`: PASS (0 errores)
  - `npm run lint` desde la raíz: PASS (exit 0; 1 warning preexistente en `Home.module.css`)
  - `npm test` en `backend/` (`NODE_ENV=test`): PASS (53/53 tests)
  - Auditoría de código: sin `any`, sin `console.log`, sin `window.alert`/`window.confirm` en los archivos tocados.

## 6. TARJETA DE ENTREGA PARA TRELLO
<!-- Completado por 05-reviewer -->
- **Qué pasaba:** Al publicar un empleo, la descripción no se guardaba. Al editar, todos los campos aparecían vacíos obligando a reescribir todo. El campo de descripción se veía distinto (gris y con otra tipografía) al resto del formulario. Además, al eliminar salía una ventana de alerta del navegador y, si recargabas la pestaña de un empleo ya eliminado, aparecía un error crudo.
- **Qué se hizo:** El formulario ahora guarda toda la información (descripción, responsabilidades, requisitos y acerca de la empresa) y al editar carga automáticamente los datos actuales. Todos los campos comparten el mismo estilo. Eliminar funciona de un solo clic sin ventanas de alerta y los empleos inexistentes muestran una pantalla clara para volver a la búsqueda.
- **Cómo probarlo paso a paso:**
  1. Iniciar sesión y entrar a **"Publicar empleo"** desde el menú de usuario.
  2. Completar todos los campos (Título, Empresa, Ubicación, Descripción, Responsabilidades, Requisitos, Acerca de la empresa, Tecnologías, Nivel, Modalidad) y publicar.
  3. Verificar en el detalle que la descripción y las secciones nuevas se muestran correctamente.
  4. Clic en **"Editar"**: verificar que TODOS los campos aparecen precargados con los valores actuales.
  5. Verificar que el campo de Descripción (y los textareas nuevos) se ven con el mismo estilo que los demás inputs.
  6. Volver al detalle y hacer clic en **"Eliminar"** (botón rojo): debe eliminar directamente sin mostrar alertas y volver a la búsqueda.
  7. Recargar en el navegador la dirección de un empleo ya eliminado: debe aparecer **"Empleo no encontrado"** con botón **"Volver a la búsqueda"**.
