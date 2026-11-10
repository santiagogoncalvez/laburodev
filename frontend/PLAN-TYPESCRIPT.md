# Plan: Migración Maestra a TypeScript (laburoDev)

## 1. Regla de Oro
- Todos los archivos de plan, docs y arquitectura residen estrictamente en la raíz del proyecto.

## 2. Grupos de Ejecución (Migración Progresiva)

### Grupo A: Infraestructura de Tipos y Contratos
- Configuración de `tsconfig.json` (React 19 + Vite).
- Instalación de tipos: `typescript`, `@types/react`, `@types/react-dom`.
- **Capa puente**: Crear `src/types/index.ts` que importe/re-exporte los esquemas de `backend/schemas/jobs.ts` para tener una única fuente de verdad.

### Grupo B: Capa de Datos (Hooks y Servicios)
- Migración de `src/hooks/` (ej: `useJobs.jsx`, `useAISummary.jsx`).
- Aplicar `@frontend-async-best-practices` para tipar respuestas de API y estados.
- Documentar en `PENDING_FIXES.md` errores de lógica encontrados.

### Grupo C: Capa de UI (Componentes y Pages)
- Migración de `src/components/` y `src/pages/`.
- Uso de `Shoehorn` para props parciales y mocks de tests.
- Aplicar `@frontend-design` para verificar consistencia con `DESIGN-SYSTEM.md`.

### Grupo D: Estado Global y Configuración (App)
- Migración de `src/store/` (Zustand) y `src/App.jsx`.
- Implementación de manejo de rutas (404) y SEO/Metadata.

## 3. Aseguramiento (Quality Gate)
- **Security Check**: @security-review auditará cada grupo tras migrar.
- **Strict Mode**: El build fallará si hay `any` o errores de tipo (tsc --noEmit).
- **Escritura**: Validar que los componentes que hacen POST/PUT incluyan el manejo de la `WRITE_API_KEY` (x-api-key) según los nuevos requisitos del backend.

## 4. Gestión de Errores (Bitácora)
- Todo error de lógica que no sea de tipado se moverá a `frontend/PENDING_FIXES.md` para ser resuelto en una fase de "estabilización" posterior.
