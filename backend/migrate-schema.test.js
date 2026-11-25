// T-004 — Migración automática: flag --schema-only de db/seed.ts (SQLite local).
// Corre seed.ts en un proceso hijo, nunca contra Turso (sin red ni secrets).
//
// RED (estado inicial): el flag todavía no existe en seed.ts, así que el
// comando ignora "--schema-only" y hace el seed completo (DELETE FROM jobs)
// → los escenarios 1 y 4 fallan. El 3 es regresión y nace en verde.
import { test, after } from "node:test";
import assert from "node:assert";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db/index.js";

const execFileAsync = promisify(execFile);
const BACKEND_DIR = path.dirname(fileURLToPath(import.meta.url));
const MARKER_S1 = "t004-s1-marker";
const MARKER_S3 = "t004-s3-marker";
const MARKER_S4 = "t004-s4-marker";

// Ejecuta `node --import tsx db/seed.ts [flags]` con cwd en backend/ y sin
// TURSO_* en el entorno → cae siempre a file:local.db.
async function runSeed(flags = []) {
   const env = { ...process.env };
   delete env.TURSO_DATABASE_URL;
   delete env.TURSO_AUTH_TOKEN;
   try {
      const { stdout, stderr } = await execFileAsync(
         process.execPath,
         ["--import", "tsx", "db/seed.ts", ...flags],
         { cwd: BACKEND_DIR, env, timeout: 60_000 },
      );
      return { code: 0, output: `${stdout}${stderr}` };
   } catch (err) {
      const code = typeof err.code === "number" ? err.code : 1;
      return { code, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
   }
}

async function jobColumns() {
   const info = await db.execute("PRAGMA table_info(jobs)");
   return info.rows.map((row) => row.name);
}

async function countJobs() {
   const result = await db.execute("SELECT count(*) AS total FROM jobs");
   return Number(result.rows[0].total);
}

// Empleo marcador con id propio: detecta un DELETE silencioso aunque el
// conteo total vuelva a coincidir con jobs.json.
async function insertMarker(id) {
   await db.execute({ sql: "DELETE FROM jobs WHERE id = ?", args: [id] });
   await db.execute({
      sql: `INSERT INTO jobs (id, title, company, location, level, modality, technology, description, responsibilities, requirements, about)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
         id,
         `T-004 marker ${id}`,
         "T004 QA",
         "argentina",
         "junior",
         "remoto",
         "[]",
         "descripcion",
         "[]",
         "[]",
         "acerca",
      ],
   });
}

async function markerRow(id) {
   const result = await db.execute({
      sql: "SELECT id, title FROM jobs WHERE id = ?",
      args: [id],
   });
   return result.rows[0];
}

// Restaura el estado canónico (dataset de jobs.json + user_id + sin markers)
// para no afectar los tests existentes, que comparten local.db.
after(async () => {
   const { code, output } = await runSeed();
   assert.strictEqual(
      code,
      0,
      `La restauración final con db:seed falló (exit ${code}):\n${output}`,
   );
});

// Escenario 1 — --schema-only no borra empleos y agrega columnas faltantes
test("Escenario 1: --schema-only agrega user_id sin borrar empleos y sale con 0", async () => {
   // Dado: la tabla jobs SIN la columna user_id
   const cols = await jobColumns();
   if (cols.includes("user_id")) {
      await db.execute("ALTER TABLE jobs DROP COLUMN user_id");
   }
   assert.ok(
      !(await jobColumns()).includes("user_id"),
      "Setup: user_id debía quedar eliminada",
   );

   await insertMarker(MARKER_S1);
   const expectedCount = await countJobs();

   // Cuando: corro el comando migrate (schema-only)
   const { code, output } = await runSeed(["--schema-only"]);

   // Entonces: exit 0, columna presente y filas intactas
   assert.strictEqual(code, 0, `--schema-only debe salir con código 0:\n${output}`);
   assert.ok(
      (await jobColumns()).includes("user_id"),
      "La tabla jobs debe tener la columna user_id tras el migrate",
   );
   assert.strictEqual(
      await countJobs(),
      expectedCount,
      `--schema-only no debe borrar ni reinsertar filas (esperadas ${expectedCount})`,
   );
   assert.ok(
      await markerRow(MARKER_S1),
      `El empleo marcador ${MARKER_S1} debe seguir existiendo tras --schema-only`,
   );
});

// Escenario 3 — db:seed sin flags conserva el comportamiento actual (regresión)
test("Escenario 3: db:seed sin flags borra y reinserta desde jobs.json", async () => {
   const jobs = JSON.parse(
      fs.readFileSync(path.join(BACKEND_DIR, "jobs.json"), "utf-8"),
   );

   await insertMarker(MARKER_S3);

   const { code, output } = await runSeed();

   assert.strictEqual(code, 0, `db:seed debe salir con código 0:\n${output}`);
   assert.strictEqual(
      await countJobs(),
      jobs.length,
      `db:seed sin flags debe dejar exactamente los ${jobs.length} empleos de jobs.json`,
   );
   assert.strictEqual(
      await markerRow(MARKER_S3),
      undefined,
      `db:seed sin flags debe ejecutar DELETE FROM jobs (el marcador ${MARKER_S3} ya no existe)`,
   );
});

// Escenario 4 (parte local) — el migrate jamás elimina filas existentes
test("Escenario 4: --schema-only no elimina filas existentes", async () => {
   await insertMarker(MARKER_S4);
   const expectedCount = await countJobs();

   const { code, output } = await runSeed(["--schema-only"]);

   assert.strictEqual(code, 0, `--schema-only debe salir con código 0:\n${output}`);
   assert.ok(
      await markerRow(MARKER_S4),
      `El empleo marcador ${MARKER_S4} debe seguir existiendo tras --schema-only (migrate jamás borra datos)`,
   );
   assert.strictEqual(
      await countJobs(),
      expectedCount,
      `--schema-only no debe alterar el número de filas (esperadas ${expectedCount})`,
   );
});

// Coordinador (T-004): refuerzo de invariantes — flags contradictorios e idempotencia.
test("Invariante: --schema-only + --reset se rechaza y no borra datos", async () => {
   await insertMarker("t004-invalid-combo-marker");
   const before = await countJobs();

   const { code, output } = await runSeed(["--schema-only", "--reset"]);

   assert.notStrictEqual(code, 0, "La combinacion invalida debe fallar: " + output);
   assert.ok(
      output.includes("--schema-only") || output.includes("--reset"),
      "El error debe explicar la combinacion invalida: " + output,
   );
   assert.strictEqual(
      await countJobs(),
      before,
      "La combinacion invalida no debe borrar ni reinsertar filas",
   );
   assert.ok(
      await markerRow("t004-invalid-combo-marker"),
      "El marcador debe sobrevivir al rechazo",
   );
});

test("Invariante: --schema-only es idempotente en dos corridas consecutivas", async () => {
   await insertMarker("t004-idempotent-marker");
   const before = await countJobs();

   const first = await runSeed(["--schema-only"]);
   const second = await runSeed(["--schema-only"]);

   assert.strictEqual(first.code, 0, "1a corrida debe salir 0: " + first.output);
   assert.strictEqual(second.code, 0, "2a corrida debe salir 0: " + second.output);
   assert.strictEqual(await countJobs(), before, "Dos migraciones no alteran el estado");
   assert.ok(await markerRow("t004-idempotent-marker"), "El marcador debe sobrevivir");
});