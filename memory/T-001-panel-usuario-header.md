# EXPEDIENTE: T-001 - Panel de usuario en el header (reemplaza enlace "Perfil")

- **Fecha:** 2026-11-19
- **Categoría (Triage):** UI / CHORE
- **Estado:** ESPERANDO_APROBACION

## 1. ¿PARA QUÉ SE HACE? (Contexto y Ruta de Trabajo)
<!-- Completado por el Coordinador en Modo Plan -->
- **Problema o Necesidad de Negocio:** Cuando el usuario está logueado, el acceso a su cuenta es un enlace de texto "Perfil" en la nav, y el botón "Cerrar sesión" está suelto en las acciones del header. Se busca un patrón de cuenta más limpio y estándar (estilo panel desplegable tipo HP): un icono de usuario junto al icono de tema que agrupe "Cuenta" y "Cerrar sesión".
- **Resultado Esperado:** Header más minimalista: sin enlace "Perfil" en la nav; icono de usuario al lado de `ThemeToggle`; al hacer click se abre un panel con "Cuenta" (→ `/profile`) y "Cerrar sesión". Sin sesión: sin icono, con el acceso a login como hoy.
- **Pipeline de Agentes Asignado** (ruta UI/CHORE del Coordinador):
  - [ ] Paso 1: Coordinador - Contrato (Sección 2) — *completado en Modo Plan*
  - [ ] Paso 2: 04-implementador - Implementar el panel en frontend
  - [ ] Paso 3: 05-reviewer - Auditoría + tarjeta de entrega

## 2. CONTRATO TÉCNICO Y PLAN DE ARCHIVOS (La Especificación para el Implementador)
<!-- Completado por Coordinador (ruta UI/CHORE) -->

- **Archivos a crear/modificar:**
  - **Crear:** `frontend/src/components/UserMenu.tsx` — componente del botón-icono + panel desplegable (icono `User` de lucide-react, mismas dimensiones que `ThemeToggle`: 2.5rem, redondo, hover `--bg-soft`).
  - **Modificar:** `frontend/src/components/Header.tsx` — quitar el `NavLink` "Perfil (N)" de la nav (izquierda); reemplazar `HeaderUserButton` por `<UserMenu />` en `header-actions`, al lado de `<ThemeToggle />`.
  - **Modificar:** `frontend/src/index.css` — estilos del botón del usuario (reutilizar clase `.theme-toggle` como base o nueva `.user-menu`) y del panel (`.user-menu-panel`): posicionado abajo-derecha del botón (`position: absolute` sobre un contenedor `relative`), fondo `--bg-soft`/token de superficie, bordes con token existente (`--r-md` aprox.), sin sombras pesadas, opciones con padding y hover, sin emoji, tipografía del sistema (tokens `--fs-small`).
- **Comportamiento:**
  - **Sin sesión (`isPending`):** no renderizar nada (mismo anti-parpadeo actual). **Sin sesión (confirmada):** mantener el `Link` "Iniciar sesión" actual (btn-ghost btn-sm) — no se toca.
  - **Con sesión:** renderizar icono `User`; click alterna el panel.
  - **Panel (2 opciones):**
    1. **Cuenta** → navega a `/profile` (React Router `Link` o `navigate`) y cierra el panel.
    2. **Cerrar sesión** → `await authClient.signOut()` + `clearFavorites()` (misma lógica que hoy) y cierra el panel.
  - **Cierre del panel:** click fuera del panel (listener de click en `document` o `onBlur` simple — sin dependencias nuevas), `Escape`, y al navegar.
  - **Accesibilidad:** `aria-label` en el botón ("Menú de cuenta"), `aria-expanded`, botón de tipo `button`.
- **Invariantes y Reglas de Negocio:**
  - El contador de favoritos `(N)` que hoy vive en el enlace "Perfil" **se elimina de la nav** (default propuesto: sigue visible en la página de perfil; si querés conservarlo en el panel, se agrega como opción extra — avisar si es requisito).
  - No se toca `ThemeToggle`, `ProtectedRoute`, `ProfilePage`, ni el resto de la nav ("Empleos" queda igual).
  - Cero dependencias nuevas; solo `lucide-react` (ya usado) y React Router (ya usado).
  - Estilo según `frontend/DESIGN-SYSTEM.md`: minimalista, tokens existentes, cero emoji.
- **Escenarios de Prueba (Gherkin):**
  - **Dado** un usuario logueado, **Cuando** hace click en el icono de usuario del header, **Entonces** se abre un panel con "Cuenta" y "Cerrar sesión".
  - **Dado** el panel abierto, **Cuando** hace click en "Cuenta", **Entonces** navega a `/profile` y el panel se cierra.
  - **Dado** el panel abierto, **Cuando** hace click en "Cerrar sesión", **Entonces** la sesión se cierra, los favoritos locales se limpian y el header vuelve al estado de invitado.
  - **Dado** un usuario sin sesión, **Cuando** carga cualquier página, **Entonces** no hay icono de usuario ni enlace "Perfil", y el botón "Iniciar sesión" sigue visible.
  - **Dado** el panel abierto, **Cuando** hace click fuera o presiona Escape, **Entonces** el panel se cierra.

## 3. REGISTRO DE PRUEBAS (QA Automation)
<!-- Ruta UI/CHORE: sin worker tester — validación manual por escenarios + build/lint -->

## 4. ¿POR QUÉ SE HIZO ASÍ? (Decisiones Técnicas de Implementación)
<!-- Completado por 04-implementador -->
- **Enfoque elegido:** Componente `UserMenu.tsx` autocontenido que maneja los 3 estados de sesión (pending → null, sin sesión → Link de login, con sesión → icono + panel). El cierre del panel se resuelve con un `backdrop` fijo (`position: fixed; inset: 0`) renderizado solo cuando está abierto: cubre todo el viewport, así el click afuera lo cierra sin listeners globales de mouse. Escape vía un único `useEffect` condicionado a `open` (con cleanup).
- **Alternativas descartadas:**
  - `onBlur`/`onFocus` en el contenedor: frágil con el orden de foco entre botones del panel.
  - Librería de dropdown (`radix-ui`, `headless-ui`): innecesaria para 2 opciones — cero dependencias nuevas.
  - `position: absolute` en el backdrop: el contenedor `.user-menu` es `relative`, un backdrop absoluto solo cubriría el header.
- **Notas para mantenimiento futuro:**
  - El botón reutiliza la clase `.theme-toggle` para heredar tamaño/hover sin duplicar CSS.
  - `var(--border, ...)` usa fallback porque el token `--border` todavía no existe en `index.css`; definirlo cuando se agregue un borde global.
  - El contador `(N)` de favoritos se eliminó de la nav (aprobado por Santiago): visible solo en `/profile`.
  - Fix colateral: Biome reformateó `App.tsx`, `useFavoritesSync.ts` y `favoritesStore.ts` (CRLF→LF, errores preexistentes de la rama; cambios solo de formato).

## 5. ¿CON QUÉ SE HIZO? (Inventario Técnico y Auditoría)
<!-- Completado por 05-reviewer -->
- **Resumen de cambios por archivo:**
  - `frontend/src/components/UserMenu.tsx` (nuevo, 77 líneas): icono `User` (lucide-react 18px), panel con "Cuenta" → `/profile` (navigate) y "Cerrar sesión" (`authClient.signOut()` + `clearFavorites()`), backdrop + Escape, `aria-label`/`aria-expanded`/`role="menu"`.
  - `frontend/src/components/Header.tsx`: eliminados el NavLink "Perfil (N)" y el componente `HeaderUserButton` (incluido el estado de login, movido a `UserMenu`); eliminados los imports `useSession`/`useFavoritesStore` que quedaron sin uso. Ahora renderiza `ThemeToggle` + `UserMenu`.
  - `frontend/src/index.css`: +44 líneas — `.user-menu` (relative), `.user-menu-backdrop` (fixed, z-40), `.user-menu-panel` (absolute abajo-derecha, z-50, tokens `--bg`/`--r-md`/`--r-sm`/`--fs-small`), estilos de opciones con hover `--bg-soft`.
  - Colateral (fuera de contrato, gate de lint): formato de `App.tsx`, `useFavoritesSync.ts`, `favoritesStore.ts` (solo CRLF→LF, 0 cambios lógicos).
- **Patrones, herramientas o queries aplicadas:** React hooks (early returns después de todos los hooks, respetando reglas de hooks), tokens del DESIGN-SYSTEM, sin dependencias nuevas, sin emoji.
- **Veredicto de Auditoría:** **APROBADO** — `tsc -b` + `vite build` ✅ · `biome check` 0 errores (1 warning preexistente en `Home.module.css`, fuera de alcance) · backend no tocado · validación manual en dev server por Santiago: panel abre, links navegan, cerrar sesión funciona ✅

## 6. TARJETA DE ENTREGA PARA TRELLO
<!-- Completado por 05-reviewer -->
- **Qué pasaba:** Cuando el usuario estaba logueado, su cuenta se manejaba con un enlace de texto "Perfil" en la barra de navegación y un botón "Cerrar sesión" suelto en el header. Ocupaba espacio en la nav y no seguía un patrón estándar de menú de cuenta.
- **Qué se hizo:** Se reemplazó por un icono de usuario al lado del icono de tema (estilo panel tipo HP): al hacer click se abre un panel con "Cuenta" y "Cerrar sesión". La nav quedó solo con "Empleos". Sin sesión, se mantiene el botón "Iniciar sesión" como hasta ahora.
- **Cómo probarlo (como usuario en la plataforma):**
  1. Iniciar sesión → en el header, junto al icono de luna/sol, aparece un icono de usuario
  2. Hacer click → se abre el panel con "Cuenta" y "Cerrar sesión"
  3. Click en "Cuenta" → lleva al perfil; "Cerrar sesión" → vuelve a estado invitado y el icono desaparece
  4. Abrir el panel y presionar Escape o hacer click afuera → el panel se cierra
