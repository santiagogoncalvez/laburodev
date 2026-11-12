// Contratos de datos de la API — propiedad del frontend.
// Duplicación INTENCIONAL: los paquetes son independientes (sin workspaces)
// y el frontend NO debe compilar código del backend (rompió el CI en #26).
// Espejo de la respuesta real de backend/ — si el backend cambia una respuesta,
// se actualiza este archivo. Futuro: monorepo con packages/shared
// (ver PLAN-TYPESCRIPT.md / HANDOFF.md §4.8).

/** Sección `data` de un empleo en la respuesta de la API. */
export interface JobData {
  level: string;
  modality: string;
  technology: string[];
}

/** Sección `content` de un empleo en la respuesta de la API. */
export interface JobContent {
  description: string;
  responsibilities: string[];
  requirements: string[];
  about: string;
}

/** Empleo en la respuesta de la API. */
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  createdAt: string | null;
  data: JobData;
  content: JobContent;
}

/** Respuesta paginada de GET /jobs. */
export interface PaginatedJobsResponse {
  data: Job[];
  total: number;
  limit: number;
  offset: number;
}

/** Query params que acepta GET /jobs (la visión del frontend de los filtros). */
export interface JobsQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  level?: string;
  technology?: string;
  modality?: string;
}
