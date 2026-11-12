// Tipos base compartidos por toda la capa de negocio (service → controller → rutas).
// Los tipos de ENTRADA (lo que valida Zod) se derivan con z.infer en schemas/jobs.ts.

/** Sección `data` de un empleo tal como responde la API. */
export interface JobData {
  level: string;
  modality: string;
  technology: string[];
}

/** Sección `content` de un empleo tal como responde la API. */
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

/** Filtros y paginación que acepta JobModel.getAll (controller → service → model). */
export interface GetAllParams {
  limit?: number;
  offset?: number;
  search?: string;
  level?: string;
  technology?: string;
  modality?: string;
  location?: string;
}

/** Valores distintos que alimentan los selects de filtros (GET /jobs/options). */
export interface FilterOptions {
  technologies: string[];
  locations: string[];
  levels: string[];
}
