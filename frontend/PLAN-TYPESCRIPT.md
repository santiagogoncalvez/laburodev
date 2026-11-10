# Plan: Migración de Frontend a TypeScript

## Objetivo
Migrar el frontend de `laburoDev` a TypeScript tras haber completado la migración del backend. Aprovechar los contratos de tipos (interfaces) definidos en el backend para asegurar una comunicación tipo-segura entre ambos.

## Pasos de Ejecución

### 1. Configuración del Entorno Frontend
- [ ] Instalar dependencias necesarias: `typescript`, `@types/react`, `@types/react-dom`.
- [ ] Crear `frontend/tsconfig.json` ajustado a React 19 + Vite (strict mode).
- [ ] Actualizar `frontend/package.json`:
    - Añadir script `typecheck` (`tsc -b`).
    - Añadir script `build` (asegurando `tsc` antes de `vite build`).

### 2. Conversión Progresiva (Feature-by-Feature)
- [ ] **Estrategia**: Utilizar el enfoque de "features verticales". No migrar todo a la vez.
- [ ] **Migrar `src/hooks/`**: Es la capa de consumo de API. Tipar las respuestas de los `fetch` basándose en los tipos del backend.
- [ ] **Migrar `src/components/` y `src/pages/`**:
    - Tipar props de componentes (`React.FC` o `interface Props`).
    - Utilizar `@total-typescript/shoehorn` cuando se necesiten datos parciales o mocks seguros sin abusar de `as`.
- [ ] **Migrar `src/store/` (Zustand)**: Tipar el store global de usuario/auth.

### 3. Integración de Tipos (El "Puente")
- [ ] **Shared Types**: Si es posible, centralizar las interfaces de `Job` que consume el front y produce el back para que el front no tenga que redefinirlas.
- [ ] **Validación**: Usar los esquemas de Zod del backend (si se pueden compartir) o mantener interfaces sincronizadas.

### 4. Aseguramiento (Security & Best Practices)
- [ ] @security-review: Auditar los `fetch` en el frontend para asegurar que las entradas de usuario no se procesan de forma insegura antes de enviarse al back.
- [ ] @typescript-best-practices: Eliminar todos los `any` y asegurar que los estados de React tengan tipos definidos.

---

## Estrategia de Migración Combinada (Back + Front)
Para asegurar que todo funcione como una unidad:
1. **Fase Backend**: Ya iniciada/completada según el plan anterior.
2. **Fase CI/CD**: Una vez que el backend esté en TS, el workflow de CI debe exigir `typecheck` para ambos paquetes antes del build.
3. **Fase Frontend**: Seguir el plan de arriba una vez que el contrato de datos (backend) sea estable.
