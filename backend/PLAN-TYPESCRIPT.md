# Plan: Migración de Backend a TypeScript

## Objetivo
Migrar el backend de `laburoDev` a TypeScript para garantizar la seguridad de los tipos, facilitando futuras integraciones (Auth, usuarios) y reduciendo errores de runtime.

## Pasos de Ejecución

### 1. Configuración del entorno
- [x] Instalar dependencias necesarias: `typescript`, `@types/node`, `@types/express`, `tsx` (+ `@types/cors`).
- [x] Crear `backend/tsconfig.json` ajustado a Node.js y Express 5 (strict mode, esmoduleinterop).
- [x] Actualizar `backend/package.json`:
    - Añadir script `build` (`tsc`).
    - Añadir script `typecheck` (`tsc --noEmit`).
    - Añadir script `dev` (`tsx watch app.ts` — el plan decía `app.js`, pero el entrypoint quedó como `.ts`).
    - Ajustar `npm start` para ejecutar el build (`node dist/app.js`).
    - `test` → `node --import tsx --test` (tsx ejecuta los `.ts`).
    - `db:seed` / `db:reset` → `tsx db/seed.ts`.

### 2. Conversión de Archivos (en orden de dependencia)
- [x] **Definir Tipos Base (`backend/types/index.ts`)**: Interfaz `Job`, `JobData`, `JobContent`, `PaginatedJobsResponse`, `GetAllParams`.
- [x] **Migrar `backend/db/` y `backend/models/`**: Renombrados a `.ts`, consultas tipadas con `JobRow` (cast único en `mapRow`) y `Row` de libSQL.
- [x] **Migrar `backend/services/`**: Firmas tipadas con los tipos definidos.
- [x] **Migrar `backend/controllers/`**: `req`/`res` tipados (`Request<{ id: string }>` donde hay params de ruta).
- [x] **Migrar `backend/routes/` y `backend/app.ts`**: Importaciones finales ajustadas.
- [x] **Además (cadena de dependencias)**: `schemas/jobs.ts`, `middlewares/cors.ts`, `middlewares/rateLimit.ts`, `config.ts`, `server.ts`, `db/seed.ts`.
- [x] **`Dockerfile.vercel`**: multi-stage con `npm run build` → `CMD ["node", "dist/server.js"]`.

### 3. Refactorización y Tipado
- [x] Utilizar `z.infer` de Zod para derivar tipos automáticamente (`JobInput`, `JobUpdateInput`, `JobDataInput`, `JobContentInput` en `schemas/jobs.ts`).
- [x] Resolver errores de compilación (`npm run typecheck` limpio).

### 4. Validación Final
- [ ] **Configurar el flujo de CI (`.github/workflows/ci.yml`) para incluir `npm run typecheck` antes de los tests** — pendiente: está fuera de `backend/`, requiere aprobación. Nota: hoy el CI llama `node --test` y `node db/seed.js` directo; hay que cambiarlo a `npm test` y `npm run db:seed` (o `node --import tsx --test`) para que pase con los `.ts`.
- [x] Compilar el proyecto (`npm run build` → `dist/` OK).
- [x] Ejecutar tests: `NODE_ENV=test npm test` → **32/32 en verde** con tsx cargando los `.ts`.

## Reglas de Oro
- **No tocar el frontend.**
- **Mantener la estructura:** Seguir con `routes -> controllers -> services -> models`.
- **Compatibilidad:** El código final debe ser compatible con la compilación para Vercel.

## Notas de la migración
- `maxTokens: 300` en `routes/ai.ts` era ignorado en runtime (AI SDK v5 lo renombró); ahora es `maxOutputTokens: 300` y el límite sí aplica.
- Zod v4 eliminó `.errors`: la rama muerta de `routes/ai.ts` se redujo a `.issues` (mismo comportamiento).
- `mapRow` en `models/jobs.ts` unifica el mapeo fila→Job (antes estaba duplicado en `getAll` y `getById`).
- Los tests siguen siendo `.js` (`app.test.js`); solo cambió el runner (`node --import tsx --test`).
