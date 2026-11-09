import { db } from "../db/index.js";
import type { Row } from "@libsql/client";
import type { Job, GetAllParams, PaginatedJobsResponse } from "../types/index.js";
import type { JobInput, JobUpdateInput, JobDataInput, JobContentInput } from "../schemas/jobs.js";

// Helpers de normalización en el límite con la DB: todo verificado, sin `as`.
function asString(v: unknown): string {
   return typeof v === "string" ? v : "";
}

function parseJsonArray(v: unknown): string[] {
   if (typeof v !== "string" || v === "") return [];
   try {
      const parsed: unknown = JSON.parse(v);
      return Array.isArray(parsed)
         ? parsed.filter((x): x is string => typeof x === "string")
         : [];
   } catch {
      return [];
   }
}

function mapRow(row: Row): Job {
   return {
      id: asString(row.id),
      title: asString(row.title),
      company: asString(row.company),
      location: asString(row.location),
      createdAt: typeof row.created_at === "string" ? row.created_at : null,
      data: {
         level: asString(row.level),
         modality: asString(row.modality),
         technology: parseJsonArray(row.technology),
      },
      content: {
         description: asString(row.description),
         responsibilities: parseJsonArray(row.responsibilities),
         requirements: parseJsonArray(row.requirements),
         about: asString(row.about),
      },
   };
}

export class JobModel {
   static async getAll ({ limit = 10, offset = 0, search, level, technology, modality }: GetAllParams = {}): Promise<PaginatedJobsResponse> {
      let sql = "SELECT * FROM jobs WHERE 1=1";
      const params: (string | number)[] = [];

      if (search) {
         sql += " AND (title LIKE ? OR description LIKE ?)";
         params.push(`%${search}%`, `%${search}%`);
      }

      if (level) {
         sql += " AND level = ?";
         params.push(level);
      }

      if (technology) {
         sql += " AND technology LIKE ?";
         params.push(`%${technology}%`);
      }

      if (modality) {
         sql += " AND modality = ?";
         params.push(modality);
      }

      const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as count");
      // El COUNT se calcula ANTES de agregar LIMIT/OFFSET: params contiene solo
      // los filtros y hay que pasarlos TODOS (el slice(0, -2) anterior borraba
      // los filtros y devolvía total=0 con cualquier consulta filtrada).
      const countResult = await db.execute({ sql: countSql, args: params });
      const total = Number(countResult.rows[0].count);

      sql += " LIMIT ? OFFSET ?";
      params.push(Number(limit ?? 10), Number(offset ?? 0));

      const result = await db.execute({ sql, args: params });

      const rows = result.rows;
      return {
         data: rows.map((row) => mapRow(row)),
         total: total,
         limit: Number(limit ?? 10),
         offset: Number(offset ?? 0),
      };
   }

   static async getById (id: string): Promise<Job | null> {
      const result = await db.execute({
         sql: "SELECT * FROM jobs WHERE id = ?",
         args: [String(id)],
      });

      const row = result.rows[0];
      if (!row) return null;

      return mapRow(row);
   }

   static async create (inputData: JobInput): Promise<Job | null> {
      const id = crypto.randomUUID();

      const { title, company, location, data, content } = inputData;
      const { technology, mode, level } = data;
      const contentData: Partial<JobContentInput> = content ?? {};
      const { description, responsibilities, requirements, about } = contentData;

      // Normalización: asegurar que los campos sean strings para la DB
      const techStr = JSON.stringify(Array.isArray(technology) ? technology : [technology]);
      const respStr = JSON.stringify(Array.isArray(responsibilities) ? responsibilities : [responsibilities]);
      const reqStr = JSON.stringify(Array.isArray(requirements) ? requirements : [requirements]);

      await db.execute({
         sql: `
            INSERT INTO jobs (id, title, company, location, level, modality, technology, description, responsibilities, requirements, about)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         `,
         args: [
            id, title, company, location ?? "", level ?? null, mode ?? "remoto",
            techStr, description ?? "", respStr, reqStr, about ?? ""
         ],
      });

      return this.getById(id);
   }

   static async update (id: string, inputData: JobInput | JobUpdateInput): Promise<Job | null> {
      const existing = await this.getById(id);
      if (!existing) return null;

      const { title, company, location, data, content } = inputData;
      const dataInput: Partial<JobDataInput> = data ?? {};
      const { technology, mode, level } = dataInput;
      const contentData: Partial<JobContentInput> = content ?? {};
      const { description, responsibilities, requirements, about } = contentData;

      const techStr = technology ? JSON.stringify(Array.isArray(technology) ? technology : [technology]) : null;
      const respStr = responsibilities ? JSON.stringify(Array.isArray(responsibilities) ? responsibilities : [responsibilities]) : null;
      const reqStr = requirements ? JSON.stringify(Array.isArray(requirements) ? requirements : [requirements]) : null;

      await db.execute({
         sql: `
            UPDATE jobs
            SET title = COALESCE(?, title), 
                company = COALESCE(?, company), 
                location = COALESCE(?, location), 
                level = COALESCE(?, level), 
                modality = COALESCE(?, modality), 
                technology = COALESCE(?, technology),
                description = COALESCE(?, description), 
                responsibilities = COALESCE(?, responsibilities),
                requirements = COALESCE(?, requirements), 
                about = COALESCE(?, about)
            WHERE id = ?
         `,
         args: [
            title ?? null, 
            company ?? null, 
            location ?? null, 
            level ?? null, 
            mode ?? null, 
            techStr, 
            description ?? null, 
            respStr, 
            reqStr, 
            about ?? null, 
            String(id)
         ],
      });

      return this.getById(id);
   }

   static async partialUpdate (id: string, inputData: JobUpdateInput): Promise<Job | null> {
      return this.update(id, inputData);
   }

   static async delete (id: string): Promise<boolean> {
      const existing = await this.getById(id);
      if (!existing) return false;

      await db.execute({
         sql: "DELETE FROM jobs WHERE id = ?",
         args: [String(id)],
      });

      return true;
   }
}
