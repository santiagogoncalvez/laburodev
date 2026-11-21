import { Router } from "express";
import { JobController } from "@/controllers/jobs.js";

export const jobsRouter = Router();

// GET abierto (lectura pública). Escrituras: autorización por sesión +
// ownership dentro del controller (Etapa B — x-api-key fue reemplazado;
// middlewares/writeGuard.ts queda archivado para la Fase 3 con roles).
jobsRouter.get("/", JobController.getAll);
jobsRouter.get("/options", JobController.getOptions);
jobsRouter.get("/:id", JobController.getId);
jobsRouter.post("/", JobController.create);
jobsRouter.put("/:id", JobController.update);
jobsRouter.patch("/:id", JobController.partialUpdate);
jobsRouter.delete("/:id", JobController.delete);
