// T-004 — Escenario 2 (parte local): aserción estática sobre ci.yml.
// Sin YAML parser: se extrae el bloque de cada job y se comparan índices.
// RED: hoy ningún job de deploy incluye el paso de migrate.
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WORKFLOW_PATH = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   "..",
   ".github",
   "workflows",
   "ci.yml",
);
const workflow = fs.readFileSync(WORKFLOW_PATH, "utf-8");

// Devuelve el bloque de líneas de un job (de su clave de 2 espacios hasta la
// siguiente clave de job). Comentarios y claves anidadas van con más indent.
function jobBlock(jobName) {
   const lines = workflow.split(/\r?\n/);
   const start = lines.indexOf(`  ${jobName}:`);
   assert.notStrictEqual(start, -1, `No se encontró el job "${jobName}" en ci.yml`);

   let end = lines.length;
   for (let i = start + 1; i < lines.length; i++) {
      if (/^  [A-Za-z0-9_-]+:$/.test(lines[i])) {
         end = i;
         break;
      }
   }
   return lines.slice(start, end).join("\n");
}

// migrate antes de cualquier paso de deploy (fallo de migrate ⇒ no se despliega)
function assertMigrateBeforeDeploy(jobName, migrateScript) {
   const block = jobBlock(jobName);
   const migrateIdx = block.indexOf(migrateScript);
   const deployIdx = block.indexOf("vercel deploy");

   assert.notStrictEqual(
      migrateIdx,
      -1,
      `El job "${jobName}" debe incluir el paso de migrate (${migrateScript})`,
   );
   assert.notStrictEqual(
      deployIdx,
      -1,
      `El job "${jobName}" debe incluir el paso de deploy ("vercel deploy")`,
   );
   assert.ok(
      migrateIdx < deployIdx,
      `En "${jobName}" el paso de migrate debe ir ANTES del deploy ` +
         `(migrate en ${migrateIdx}, deploy en ${deployIdx})`,
   );
}

test("Escenario 2 — preview-backend: db:migrate:dev corre antes del deploy", () => {
   assertMigrateBeforeDeploy("preview-backend", "db:migrate:dev");
});

test("Escenario 2 — deploy-backend: db:migrate:prod corre antes del deploy", () => {
   assertMigrateBeforeDeploy("deploy-backend", "db:migrate:prod");
});
