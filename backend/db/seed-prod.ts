// seed-prod.ts — corre el seed contra Turso (PROD).
// TURSO_DATABASE_URL_PROD / TURSO_AUTH_TOKEN_PROD viven en .env con sufijo _PROD
// para que db/index.ts nunca las cargue solo; acá se inyectan con los nombres
// que el código lee (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN) antes de importar el seed.
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const url = process.env.TURSO_DATABASE_URL_PROD;
const token = process.env.TURSO_AUTH_TOKEN_PROD;

if (!url || !token) {
  console.error(
    "❌ Faltan TURSO_DATABASE_URL_PROD / TURSO_AUTH_TOKEN_PROD en .env",
  );
  process.exit(1);
}

// Se setean ANTES de importar el seed: db/index.ts los lee al importar.
// process.loadEnvFile no pisa variables ya presentes en el entorno.
process.env.TURSO_DATABASE_URL = url;
process.env.TURSO_AUTH_TOKEN = token;

console.log(`🌍 Seed contra PROD (${new URL(url).host})`);

// Import dinámico a propósito: un import estático se eleva y correría
// antes de setear las variables de arriba.
await import("./seed.js");
