import type { Request, Response } from "express";
import { DEFAULTS } from "@/config.js";
import { JobService, type ServiceError } from "@/services/jobsService.js";

// Query params de Express llegan como string | string[] | ParsedQs: en el
// borde solo aceptamos string real. Se verifica con typeof (narrowing), no
// con `as` — un ?text=a&text=b hoy se ignora en vez de reventar en libSQL.
const single = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

// El servicio devuelve códigos de dominio; acá se traducen a HTTP.
function sendServiceError(res: Response, error: ServiceError): Response {
  if (error.code === "not_found") {
    return res.status(404).json({ message: "Job not found" });
  }
  return res.status(400).json({ message: error.message });
}

// Controller delgado: parsea la petición HTTP, delega la lógica de negocio
// (Zod, reglas de paginación, DB) en JobService y traduce su resultado a HTTP.
export class JobController {
  static async getAll(req: Request, res: Response) {
    const {
      text,
      level,
      limit = DEFAULTS.LIMIT_PAGINATION,
      offset = DEFAULTS.LIMIT_OFFSET,
      technology,
      modality,
    } = req.query;

    const result = await JobService.getAll({
      search: single(text),
      level: single(level),
      technology: single(technology),
      modality: single(modality),
      limit: Number(limit),
      offset: Number(offset),
    });

    if (!result.ok) return sendServiceError(res, result);

    return res.json(result.data);
  }

  static async getId(req: Request<{ id: string }>, res: Response) {
    const result = await JobService.getById(req.params.id);

    if (!result.ok) return sendServiceError(res, result);

    return res.json(result.data);
  }

  static async create(req: Request, res: Response) {
    const result = await JobService.create(req.body);

    if (!result.ok) return sendServiceError(res, result);

    return res.status(201).json(result.data);
  }

  static async update(req: Request<{ id: string }>, res: Response) {
    const result = await JobService.update(req.params.id, req.body);

    if (!result.ok) return sendServiceError(res, result);

    return res.json(result.data);
  }

  static async partialUpdate(req: Request<{ id: string }>, res: Response) {
    const result = await JobService.partialUpdate(req.params.id, req.body);

    if (!result.ok) return sendServiceError(res, result);

    return res.json(result.data);
  }

  static async delete(req: Request<{ id: string }>, res: Response) {
    const result = await JobService.delete(req.params.id);

    if (!result.ok) return sendServiceError(res, result);

    return res.status(204).end();
  }
}
