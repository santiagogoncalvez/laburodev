import { db } from "../db/index.js";

export class JobModel {
   static async getAll ({ limit = 10, offset = 0, search, level, technology, modality } = {}) {
      let sql = "SELECT * FROM jobs WHERE 1=1";
      const params = [];

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
      const countResult = await db.execute({ sql: countSql, args: params.slice(0, -2) });
      const total = Number(countResult.rows[0].count);

      sql += " LIMIT ? OFFSET ?";
      params.push(Number(limit ?? 10), Number(offset ?? 0));

      const result = await db.execute({ sql, args: params });

      const rows = result.rows;
      return {
         data: rows.map((row) => ({
            id: row.id,
            title: row.title,
            company: row.company,
            location: row.location,
            createdAt: row.created_at,
            data: {
               level: row.level,
               modality: row.modality,
               technology: JSON.parse(row.technology || "[]"),
            },
            content: {
               description: row.description,
               responsibilities: JSON.parse(row.responsibilities || "[]"),
               requirements: JSON.parse(row.requirements || "[]"),
               about: row.about,
            },
         })),
         total: total,
         limit: Number(limit ?? 10),
         offset: Number(offset ?? 0),
      };
   }

   static async getById (id) {
      const result = await db.execute({
         sql: "SELECT * FROM jobs WHERE id = ?",
         args: [String(id)],
      });

      const row = result.rows[0];
      if (!row) return null;

      return {
         id: row.id,
         title: row.title,
         company: row.company,
         location: row.location,
         createdAt: row.created_at,
         data: {
            level: row.level,
            modality: row.modality,
            technology: JSON.parse(row.technology || "[]"),
         },
         content: {
            description: row.description,
            responsibilities: JSON.parse(row.responsibilities || "[]"),
            requirements: JSON.parse(row.requirements || "[]"),
            about: row.about,
         },
      };
   }

   static async create (inputData) {
      const id = crypto.randomUUID();
      
      const { title, company, location, data, content } = inputData;
      const { technology, mode, level } = data;
      const { description, responsibilities, requirements, about } = content || {};

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
            id, title, company, location ?? "", level, mode ?? "remoto", 
            techStr, description ?? "", respStr, reqStr, about ?? ""
         ],
      });

      return this.getById(id);
   }

   static async update (id, inputData) {
      const existing = await this.getById(id);
      if (!existing) return null;

      const { title, company, location, data, content } = inputData;
      const { technology, mode, level } = data || {};
      const { description, responsibilities, requirements, about } = content || {};

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

   static async partialUpdate (id, inputData) {
      return this.update(id, inputData);
   }

   static async delete (id) {
      const existing = await this.getById(id);
      if (!existing) return false;

      await db.execute({
         sql: "DELETE FROM jobs WHERE id = ?",
         args: [String(id)],
      });

      return true;
   }
}
