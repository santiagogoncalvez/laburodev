import { db } from "@/db/index.js";

export class FavoriteModel {
  /** Ids de favoritos del usuario, del más reciente al más viejo. */
  static async listByUser(userId: string): Promise<string[]> {
    const result = await db.execute({
      sql: "SELECT job_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC, id",
      args: [userId],
    });
    return result.rows.map((row) => String(row.job_id));
  }

  /** Guarda el favorito (idempotente). Devuelve false si el empleo no existe. */
  static async add(userId: string, jobId: string): Promise<boolean> {
    const job = await db.execute({
      sql: "SELECT id FROM jobs WHERE id = ?",
      args: [jobId],
    });
    if (job.rows.length === 0) return false;

    await db.execute({
      sql: "INSERT OR IGNORE INTO favorites (id, user_id, job_id) VALUES (?, ?, ?)",
      args: [crypto.randomUUID(), userId, jobId],
    });
    return true;
  }

  /** Quita el favorito (idempotente: no existía = ok). */
  static async remove(userId: string, jobId: string): Promise<void> {
    await db.execute({
      sql: "DELETE FROM favorites WHERE user_id = ? AND job_id = ?",
      args: [userId, jobId],
    });
  }
}
