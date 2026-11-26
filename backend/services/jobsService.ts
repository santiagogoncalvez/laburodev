import { DEFAULTS } from "@/config.js";
import { JobModel } from "@/models/jobs.js";
import { validateJob, validatePartialJob } from "@/schemas/jobs.js";
import type {
  FilterOptions,
  GetAllParams,
  Job,
  PaginatedJobsResponse,
  UserRole,
} from "@/types/index.js";

// Resultado del servicio con CÓDIGOS DE DOMINIO, no estados HTTP: el
// controller los traduce (invalid_input → 400, not_found → 404).
// Toda la lógica de negocio vive acá — Zod, reglas de paginación y el
// chequeo de "nada que actualizar". Los controllers son solo HTTP.
export type ServiceError =
  | { ok: false; code: "invalid_input"; message: string }
  | { ok: false; code: "not_found" }
  | { ok: false; code: "forbidden"; message: string };

export type ServiceResult<T> = { ok: true; data: T } | ServiceError;

const invalidInput = (message: string): ServiceError => ({
  ok: false,
  code: "invalid_input",
  message,
});

const notFound: ServiceError = { ok: false, code: "not_found" };
const forbidden: ServiceError = {
  ok: false,
  code: "forbidden",
  message: "No autorizado para modificar este empleo",
};

// Etapa C: el rol se chequea ANTES del ownership para que un candidate
// reciba siempre el mensaje de permiso, aunque el empleo sea ajeno.
const forbiddenRole: ServiceError = {
  ok: false,
  code: "forbidden",
  message: "Se necesita rol recruiter para publicar empleos",
};

// Objetos planos solos: permite destructurar bodies sin `as` ni `any`.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class JobService {
  static async getAll(
    params: GetAllParams,
  ): Promise<ServiceResult<PaginatedJobsResponse>> {
    const limit = params.limit ?? DEFAULTS.LIMIT_PAGINATION;
    const offset = params.offset ?? DEFAULTS.LIMIT_OFFSET;

    if (
      !Number.isInteger(limit) ||
      !Number.isInteger(offset) ||
      limit < 1 ||
      offset < 0
    ) {
      return invalidInput("limit and offset must be valid numbers");
    }

    const data = await JobModel.getAll({
      ...params,
      limit: Math.min(limit, DEFAULTS.MAX_LIMIT_PAGINATION),
      offset,
    });

    return { ok: true, data };
  }

  static async getById(id: string): Promise<ServiceResult<Job>> {
    const job = await JobModel.getById(id);
    return job ? { ok: true, data: job } : notFound;
  }

  static async options(): Promise<FilterOptions> {
    return JobModel.options();
  }

  static async create(
    body: unknown,
    userId: string,
    role: UserRole,
  ): Promise<ServiceResult<Job | null>> {
    if (role !== "recruiter") return forbiddenRole;

    const parsed = validateJob(body);
    if (!parsed.success) {
      return invalidInput(parsed.error.issues[0].message);
    }

    return { ok: true, data: await JobModel.create(parsed.data, userId) };
  }

  // Ownership (Etapa B): primero 404 si no existe, después 403 si no es
  // dueño (incluye user_id NULL = empleo del seed, solo lectura).
  private static async checkOwnership(
    id: string,
    userId: string,
  ): Promise<{ ok: true; job: Job } | ServiceError> {
    const job = await JobModel.getById(String(id));
    if (!job) return notFound;
    if (job.userId !== userId) return forbidden;
    return { ok: true, job };
  }

  static async update(
    id: string,
    body: unknown,
    userId: string,
    role: UserRole,
  ): Promise<ServiceResult<Job | null>> {
    if (role !== "recruiter") return forbiddenRole;

    const ownership = await JobService.checkOwnership(id, userId);
    if (!ownership.ok) return ownership;

    const parsed = validateJob(body);
    if (!parsed.success) {
      return invalidInput(parsed.error.issues[0].message);
    }

    const job = await JobModel.update(id, parsed.data);
    return job ? { ok: true, data: job } : notFound;
  }

  static async partialUpdate(
    id: string,
    body: unknown,
    userId: string,
    role: UserRole,
  ): Promise<ServiceResult<Job | null>> {
    if (role !== "recruiter") return forbiddenRole;

    const ownership = await JobService.checkOwnership(id, userId);
    if (!ownership.ok) return ownership;

    const record = isRecord(body) ? body : {};
    const { title, company, location, description, data, content } = record;

    if (
      title === undefined &&
      company === undefined &&
      location === undefined &&
      description === undefined &&
      data === undefined &&
      content === undefined
    ) {
      return invalidInput("nothing to update");
    }

    const parsed = validatePartialJob(record);
    if (!parsed.success) {
      return invalidInput(parsed.error.issues[0].message);
    }

    const job = await JobModel.partialUpdate(id, parsed.data);
    return job ? { ok: true, data: job } : notFound;
  }

  static async delete(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<ServiceResult<null>> {
    if (role !== "recruiter") return forbiddenRole;

    const ownership = await JobService.checkOwnership(id, userId);
    if (!ownership.ok) return ownership;

    const deleted = await JobModel.delete(id);
    return deleted ? { ok: true, data: null } : notFound;
  }
}
