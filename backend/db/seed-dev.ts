// seed-dev.ts — corre el seed contra Turso (DEV, rama laburodev-dev).
// TURSO_DATABASE_URL_DEV / TURSO_AUTH_TOKEN_DEV viven en .env con sufijo _DEV
// para que db/index.ts nunca las cargue solo; acá se inyectan con los nombres
// que el código lee (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN) antes de importar el seed.
import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const url = process.env.TURSO_DATABASE_URL_DEV;
const token = process.env.TURSO_AUTH_TOKEN_DEV;

if (!url || !token) {
  console.error(
    "❌ Faltan TURSO_DATABASE_URL_DEV / TURSO_AUTH_TOKEN_DEV en .env",
  );
  process.exit(1);
}

// Se setean ANTES de importar el seed: db/index.ts los lee al importar.
// process.loadEnvFile no pisa variables ya presentes en el entorno.
process.env.TURSO_DATABASE_URL = url;
process.env.TURSO_AUTH_TOKEN = token;

console.log(`🌱 Seed contra DEV (${new URL(url).host})`);

// Import dinámico a propósito: un import estático se eleva y correría
// antes de setear las variables de arriba.
await import("./seed.js");
