# Plan: Migración Maestra a TypeScript (laburoDev)

## 1. Regla de Oro
- Todos los archivos de plan, docs y arquitectura residen estrictamente en la raíz del proyecto.

## 2. Grupos de Ejecución (Migración Progresiva)

### Grupo A: Infraestructura de Tipos y Contratos ✅ (ejecutado 2026-11-10)
- Configuración de `tsconfig.json` (React 19 + Vite, strict).
- Instalación de tipos: `typescript` (7.x), `@types/react`, `@types/react-dom`.
- **Contratos de datos — decisión**: ~~puente importando `backend/`~~ → **cada paquete es dueño de su contrato**. Los tipos viven en `src/types/api.ts` (espejo manual de la respuesta del backend, **cero imports cruzados**). El puente rompió el CI #26 al hacer que el build del front compilara `backend/`; se eliminó junto con el hack de `paths`/zod. **Futuro (Opción 2)**: monorepo con npm workspaces y `packages/shared` como fuente única cuando crezca lo compartido (ej. con auth/escrituras).

### Grupo B: Capa de Datos (Hooks y Servicios) ✅ (ejecutado 2026-11-11)
- Migración de `src/hooks/` (ej: `useJobs.jsx`, `useAISummary.jsx`).
- Aplicar `@frontend-async-best-practices` para tipar respuestas de API y estados.
- Documentar en `PENDING_FIXES.md` errores de lógica encontrados.
- Resultado: 3 hooks + `config.ts` a `.ts`; 3 hallazgos de lógica documentados (commit `f7fc429`).

### Grupo C: Capa de UI (Componentes y Pages) ✅ (ejecutado 2026-11-11)
- Migración de `src/components/` y `src/pages/`.
- Uso de `Shoehorn` para props parciales y mocks de tests.
- Aplicar `@frontend-design` para verificar consistencia con `DESIGN-SYSTEM.md`.
- Resultado: 21 componentes + 7 páginas `.tsx`, interfaces de Props, cero `any`/`as` (Shoehorn no se instaló: skill *test-only* y no hay tests). **Prerequisitos aprobados migrados acá**: `store/authStore`, `store/favoritesStore`, `constants/levels`, `lib/pagination` (los `.tsx` los importaban y `allowJs:false` no los resolvía). **Fix aprobado**: crash de producción en `/jobs/:id` (`snarkdown` con `string[]` → `join("\n")`); root cause de datos en `PENDING_FIXES.md` (commit `2245405`).

### Grupo D: Estado Global y Configuración (App) ✅ (ejecutado 2026-11-11 — migración completa)
- Migración de `src/store/` (Zustand) y `src/App.jsx` (el store quedó hecho en el Grupo C como prerequisito, con estado/acciones tipado explícito).
- Implementación de manejo de rutas (404) y SEO/Metadata.
- Resultado: `App.tsx`/`main.tsx` + entry `index.html` actualizado; ruta `*` (404) verificada; `<title>` por página vía hoisting nativo de React 19; selectores Zustand en la raíz (regla `rerender-derived-state`); `src/` queda **100% TypeScript**, sin `.jsx` residuales. Límites de SEO en SPA (404 HTTP real, `og:`) documentados en `PENDING_FIXES.md`.

## 3. Aseguramiento (Quality Gate)
- **Security Check**: @security-review auditará cada grupo tras migrar.
- **Strict Mode**: El build fallará si hay `any` o errores de tipo (tsc --noEmit).
- **Escritura**: Validar que los componentes que hacen POST/PUT incluyan el manejo de la `WRITE_API_KEY` (x-api-key) según los nuevos requisitos del backend.

## 4. Gestión de Errores (Bitácora)
- Todo error de lógica que no sea de tipado se moverá a `frontend/PENDING_FIXES.md` para ser resuelto en una fase de "estabilización" posterior.
