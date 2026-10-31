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
         total: rows.length,
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
      const title = String(inputData.title ?? "");
      const company = String(inputData.company ?? "");
      const location = String(inputData.location ?? "");
      const level = String(inputData.data?.level ?? inputData.level ?? "Junior");
      const modality = String(inputData.data?.modality ?? inputData.modality ?? "remoto");
      const technology = JSON.stringify(inputData.data?.technology ?? inputData.technology ?? []);
      const description = String(inputData.content?.description ?? inputData.description ?? "");
      const responsibilities = JSON.stringify(inputData.content?.responsibilities ?? inputData.responsibilities ?? []);
      const requirements = JSON.stringify(inputData.content?.requirements ?? inputData.requirements ?? []);
      const about = String(inputData.content?.about ?? inputData.about ?? "");

      await db.execute({
         sql: `
            INSERT INTO jobs (id, title, company, location, level, modality, technology, description, responsibilities, requirements, about)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         `,
         args: [id, title, company, location, level, modality, technology, description, responsibilities, requirements, about],
      });

      return this.getById(id);
   }

   static async update (id, inputData) {
      const existing = await this.getById(id);
      if (!existing) return null;

      const title = String(inputData.title ?? existing.title);
      const company = String(inputData.company ?? existing.company);
      const location = String(inputData.location ?? existing.location);
      const level = String(inputData.data?.level ?? existing.data.level);
      const modality = String(inputData.data?.modality ?? existing.data.modality);
      const technology = JSON.stringify(inputData.data?.technology ?? existing.data.technology ?? []);
      const description = String(inputData.content?.description ?? existing.content.description);
      const responsibilities = JSON.stringify(inputData.content?.responsibilities ?? existing.content.responsibilities);
      const requirements = JSON.stringify(inputData.content?.requirements ?? existing.content.requirements);
      const about = String(inputData.content?.about ?? existing.content.about);

      await db.execute({
         sql: `
            UPDATE jobs
            SET title = ?, company = ?, location = ?, level = ?, modality = ?, technology = ?,
                description = ?, responsibilities = ?,
                requirements = ?, about = ?
            WHERE id = ?
         `,
         args: [title, company, location, level, modality, technology, description, responsibilities, requirements, about, String(id)],
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
