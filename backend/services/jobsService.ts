import { JobModel } from "../models/jobs.js";
import type { GetAllParams } from "../types/index.js";
import type { JobInput, JobUpdateInput } from "../schemas/jobs.js";

export class JobService {
    static async getAll(params: GetAllParams) {
        return await JobModel.getAll(params);
    }

    static async getById(id: string) {
        return await JobModel.getById(id);
    }

    static async create(inputData: JobInput) {
        return await JobModel.create(inputData);
    }

    static async update(id: string, inputData: JobInput) {
        return await JobModel.update(id, inputData);
    }

    static async partialUpdate(id: string, inputData: JobUpdateInput) {
        return await JobModel.partialUpdate(id, inputData);
    }

    static async delete(id: string) {
        return await JobModel.delete(id);
    }
}
