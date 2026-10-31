import { JobModel } from "../models/jobs.js";
import { DEFAULTS } from "../config.js";
import { validateJob, validatePartialJob } from "../schemas/jobs.js";

function validationError(res, result) {
   return res.status(400).json({ message: result.error.issues[0].message });
}

export class JobController {
   static async getAll(req, res) {
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
      } = await JobModel.getAll({
         search: text,
         level,
         technology,
         modality,
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

   static async getId(req, res) {
      const { id } = req.params;

      const job = await JobModel.getById(id);

      if (!job) {
         return res.status(404).json({ message: "Job not found" });
      }

      return res.json(job);
   }

   static async create(req, res) {
      const result = validateJob(req.body);

      if (!result.success) {
         return validationError(res, result);
      }

      const newJob = await JobModel.create(result.data);

      return res.status(201).json(newJob);
   }

   static async update(req, res) {
      // Extraemos el id de los parámetros de la URL
      const { id } = req.params;

      const result = validateJob(req.body);

      if (!result.success) {
         return validationError(res, result);
      }

      const updatedJob = await JobModel.update({
         id,
         ...result.data,
      });

      if (!updatedJob) {
         return res.status(404).json({ message: "Job not found" });
      }

      return res.json(updatedJob);
   }

   static async partialUpdate(req, res) {
      // Extraemos el id de los parámetros de la URL
      const { id } = req.params;

      // Extraemos los datos del body enviado por el cliente
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

      const updatedJob = await JobModel.partialUpdate({
         id,
         ...result.data,
      });

      if (!updatedJob) {
         return res.status(404).json({ message: "Job not found" });
      }

      return res.json(updatedJob);
   }

   static async delete(req, res) {
      const { id } = req.params;

      const deleted = await JobModel.delete(id);

      if (!deleted) {
         return res.status(404).json({ message: "Job not found" });
      }

      return res.status(204).end();
   }
}
