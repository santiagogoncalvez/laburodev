import { JobModel } from "../models/jobs.js";

export class JobService {
    static async getAll(params) {
        return await JobModel.getAll(params);
    }

    static async getById(id) {
        return await JobModel.getById(id);
    }

    static async create(inputData) {
        return await JobModel.create(inputData);
    }

    static async update(id, inputData) {
        return await JobModel.update(id, inputData);
    }

    static async partialUpdate(id, inputData) {
        return await JobModel.partialUpdate(id, inputData);
    }

    static async delete(id) {
        return await JobModel.delete(id);
    }
}
