import { createClient } from "@libsql/client";

// Si no hay TURSO_DATABASE_URL definida, usamos una base de datos local de SQLite por defecto (file:local.db)
const url = process.env.TURSO_DATABASE_URL || "file:local.db";
const authToken: string | undefined = process.env.TURSO_AUTH_TOKEN;

// Compartido con auth.ts: Better Auth apunta a la misma base que el CRUD.
export const dbConfig = { url, authToken };

export const db = createClient(dbConfig);
