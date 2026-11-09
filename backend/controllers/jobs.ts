import type { Request, Response } from "express";
import { JobService } from "../services/jobsService.js";
import { DEFAULTS } from "../config.js";
import { validateJob, validatePartialJob } from "../schemas/jobs.js";

function validationError(res: Response, result: { error: { issues: { message: string }[] } }) {
   return res.status(400).json({ message: result.error.issues[0].message });
}

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

      const limitNumber = Number(limit);
      const offsetNumber = Number(offset);

      if (
         !Number.isInteger(limitNumber) ||
         !Number.isInteger(offsetNumber) ||
         limitNumber < 1 ||
         offsetNumber < 0
      ) {
         return res
            .status(400)
            .json({ message: "limit and offset must be valid numbers" });
      }

      const {
         data,
         total,
         limit: responseLimit,
         offset: responseOffset,
      } = await JobService.getAll({
         search: text as string | undefined,
         level: level as string | undefined,
         technology: technology as string | undefined,
         modality: modality as string | undefined,
         limit: Math.min(limitNumber, DEFAULTS.MAX_LIMIT_PAGINATION),
         offset: offsetNumber,
      });

      return res.json({
         data,
         total,
         limit: responseLimit,
         offset: responseOffset,
      });
   }

   static async getId(req: Request<{ id: string }>, res: Response) {
      const { id } = req.params;

      const job = await JobService.getById(id);

      if (!job) {
         return res.status(404).json({ message: "Job not found" });
      }

      return res.json(job);
   }

   static async create(req: Request, res: Response) {
      const result = validateJob(req.body);

      if (!result.success) {
         return validationError(res, result);
      }

      const newJob = await JobService.create(result.data);

      return res.status(201).json(newJob);
   }

   static async update(req: Request<{ id: string }>, res: Response) {
      const { id } = req.params;

      const result = validateJob(req.body);

      if (!result.success) {
         return validationError(res, result);
      }

      const updatedJob = await JobService.update(id, result.data);

      if (!updatedJob) {
         return res.status(404).json({ message: "Job not found" });
      }

      return res.json(updatedJob);
   }

   static async partialUpdate(req: Request<{ id: string }>, res: Response) {
      const { id } = req.params;

      const { title, company, location, description, data, content } = req.body;

      if (
         title === undefined &&
         company === undefined &&
         location === undefined &&
         description === undefined &&
         data === undefined &&
         content === undefined
      ) {
         return res.status(400).json({ message: "nothing to update" });
      }

      const result = validatePartialJob(req.body);

      if (!result.success) {
         return validationError(res, result);
      }

      const updatedJob = await JobService.partialUpdate(id, result.data);

      if (!updatedJob) {
         return res.status(404).json({ message: "Job not found" });
      }

      return res.json(updatedJob);
   }

   static async delete(req: Request<{ id: string }>, res: Response) {
      const { id } = req.params;

      const deleted = await JobService.delete(id);

      if (!deleted) {
         return res.status(404).json({ message: "Job not found" });
      }

      return res.status(204).end();
   }
}
