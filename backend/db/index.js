import { createClient } from "@libsql/client";

// Si no hay TURSO_DATABASE_URL definida, usamos una base de datos local de SQLite por defecto (file:local.db)
const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({
  url,
  authToken,
});
