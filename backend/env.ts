import { existsSync } from "node:fs";

// Carga .env ANTES de que cualquier módulo lea process.env.
// En ESM los imports se evalúan en orden de declaración: este módulo debe
// importarse PRIMERO en app.ts y en db/seed.ts, para que loadEnvFile corra
// antes de que config/cors/db lean las variables en el top de sus módulos.
// (process.loadEnvFile no pisa variables ya presentes en el entorno.)
if (existsSync(".env")) {
   process.loadEnvFile();
}
