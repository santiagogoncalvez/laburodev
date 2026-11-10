// Capa puente: contratos de datos del backend, re-exportados al frontend.
// SOLO type-exports: `export type` se borra por completo en el build de
// Vite/esbuild, así que el frontend nunca resuelve rutas hacia backend/ en
// runtime. Esto es lo que garantiza tipos sin necesidad de workspaces
// (paquetes independientes) — ver frontend/PLAN-TYPESCRIPT.md §3.

// Contratos de RESPUESTA (lo que devuelve la API).
export type {
   Job,
   JobData,
   JobContent,
   PaginatedJobsResponse,
   GetAllParams,
} from "../../../backend/types/index";

// Contratos de ENTRADA (lo que Zod valida en el backend: crear/actualizar).
export type {
   JobInput,
   JobUpdateInput,
   JobDataInput,
   JobContentInput,
} from "../../../backend/schemas/jobs";
