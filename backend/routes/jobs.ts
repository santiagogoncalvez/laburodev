import { Router } from "express";
import { JobController } from "../controllers/jobs.js";
import { writeGuard } from "../middlewares/writeGuard.js";

export const jobsRouter = Router();

// GET abierto; escrituras protegidas con x-api-key (guard temporal, ver
// middlewares/writeGuard.ts) hasta que exista auth real.
jobsRouter.get("/", JobController.getAll);
jobsRouter.get("/:id", JobController.getId);
jobsRouter.post("/", writeGuard, JobController.create);
jobsRouter.put("/:id", writeGuard, JobController.update);
jobsRouter.patch("/:id", writeGuard, JobController.partialUpdate);
jobsRouter.delete("/:id", writeGuard, JobController.delete);
