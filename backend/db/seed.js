import fs from "node:fs";
import path from "node:path";
import { db } from "./index.js";

// Países para reemplazar "Remoto" como ubicación
const FALLBACK_LOCATIONS = [
  "Argentina",
  "México",
  "Colombia",
  "Perú",
  "Chile",
  "España",
  "Uruguay",
  "Paraguay",
  "Ecuador",
  "Brasil",
];

async function seed() {
  try {
    // Reset: solo para aprendizaje/curso — recrea todo desde cero
    if (process.argv.includes("--reset")) {
      console.log("⚠️  Modo reset: eliminando tabla jobs...");
      await db.execute("DROP TABLE IF EXISTS jobs");
      console.log("🗑️  Tabla eliminada.");
    }

    console.log("⏳ Inicializando esquema de base de datos...");
    const schemaPath = path.resolve("db/schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await db.executeMultiple(schemaSql);
    console.log("✅ Esquema creado correctamente.");

    // Migración: agregar columnas faltantes si la tabla ya existía sin ellas
    console.log("⏳ Verificando migraciones de columnas...");
    const tableInfo = await db.execute("PRAGMA table_info(jobs)");
    const columns = tableInfo.rows.map(r => r.name);

    if (!columns.includes("modality")) {
      await db.execute("ALTER TABLE jobs ADD COLUMN modality TEXT NOT NULL DEFAULT 'remoto'");
      console.log("  ➕ Columna 'modality' agregada.");
    }
    if (!columns.includes("technology")) {
      await db.execute("ALTER TABLE jobs ADD COLUMN technology TEXT NOT NULL DEFAULT '[]'");
      console.log("  ➕ Columna 'technology' agregada.");
    }
    console.log("✅ Migración verificada.");

    // Crear índices después de asegurar que las columnas existan
    await db.execute("CREATE INDEX IF NOT EXISTS idx_jobs_level ON jobs(level)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title)");
    await db.execute("CREATE INDEX IF NOT EXISTS idx_jobs_modality ON jobs(modality)");
    console.log("✅ Índices creados/verificados.");

    console.log("⏳ Importando datos desde jobs.json...");
    const jsonPath = path.resolve("jobs.json");
    if (!fs.existsSync(jsonPath)) {
      console.log("⚠️ No se encontró jobs.json para hacer seed.");
      return;
    }

    const rawData = fs.readFileSync(jsonPath, "utf-8");
    const jobs = JSON.parse(rawData);

    await db.execute("DELETE FROM jobs");

    let remoteCount = 0;

    for (const job of jobs) {
      const techArray = Array.isArray(job.data?.technology)
        ? job.data.technology
        : (job.data?.technology ? [job.data.technology] : []);

      // Determinar modalidad y ubicación
      const originalLocation = job.location || "";
      const isRemote = originalLocation.toLowerCase() === "remoto";

      // Si era "Remoto", asignar modalidad remoto y ubicación random
      // Si no, mantener ubicación y asignar modalidad presencial
      const modality = isRemote ? "remoto" : "presencial";
      const location = isRemote
        ? FALLBACK_LOCATIONS[Math.floor(Math.random() * FALLBACK_LOCATIONS.length)]
        : originalLocation;

      if (isRemote) remoteCount++;

      await db.execute({
        sql: `
          INSERT INTO jobs (id, title, company, location, level, modality, technology, description, responsibilities, requirements, about)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          job.id,
          job.title,
          job.company,
          location,
          job.data.level,
          modality,
          JSON.stringify(techArray),
          job.content.description,
          JSON.stringify(job.content.responsibilities),
          JSON.stringify(job.content.requirements),
          job.content.about,
        ],
      });
    }

    console.log(`✅ Seed completado: ${jobs.length} empleos insertados.`);
    console.log(`   📊 ${remoteCount} remotos (ubicación reasignada), ${jobs.length - remoteCount} presenciales (ubicación original).`);
  } catch (err) {
    console.error("❌ Error durante el seed de la base de datos:", err);
    process.exit(1);
  }
}

seed();
