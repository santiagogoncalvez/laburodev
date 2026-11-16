import "./env.js"; // PRIMERO: .env antes de que db/index y better-auth lean process.env
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { betterAuth } from "better-auth";
import { dbConfig } from "./db/index.js";
import { ACCEPTED_ORIGINS } from "./middlewares/cors.js";

// Sesión firmada con BETTER_AUTH_SECRET (lo lee better-auth del entorno).
// En producción es obligatorio: sin él las cookies de sesión no se pueden validar.
if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "Falta BETTER_AUTH_SECRET en el entorno (Vercel) antes de arrancar.",
  );
}

export const auth = betterAuth({
  // Mismo destino que el CRUD (Turso en prod, file:local.db en dev).
  database: {
    dialect: new LibsqlDialect(dbConfig),
    type: "sqlite",
  },
  // Orígenes permitidos para llamadas con estado (llegan vía proxy:
  // Vercel rewrite en prod, Vite proxy en dev → el Host que ve el backend
  // es el suyo, no el del frontend).
  trustedOrigins: ACCEPTED_ORIGINS,
  // Fase 1: email+password básico. Sin verificación de email ni roles.
  emailAndPassword: {
    enabled: true,
  },
});
