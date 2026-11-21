import "./env.js"; // PRIMERO: .env cargado antes de que config/cors/db lean process.env
import { toNodeHandler } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import express from "express";
import helmet from "helmet";

import { auth } from "./auth.js";
import { DEFAULTS } from "./config.js";
import { corsMiddleware } from "./middlewares/cors.js";
import { generalLimiter } from "./middlewares/rateLimit.js";
import { aiRouter } from "./routes/ai.js";
import { favoritesRouter } from "./routes/favorites.js";
import { jobsRouter } from "./routes/jobs.js";

const PORT = process.env.PORT ?? DEFAULTS.PORT;

const app = express();

app.set("trust proxy", 1);

// Security headers (nosniff, CSP por defecto, etc.) en todas las respuestas.
app.use(helmet());
app.use(corsMiddleware());
// Better Auth ANTES de express.json(): su handler lee el body del stream crudo
// (si express.json() lo consume primero, Better Auth no puede procesar el body).
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());
app.use(generalLimiter);

app.use("/jobs", jobsRouter);
// Alias same-origin (Etapa B): las escrituras con cookies de sesión viajan
// por el proxy /api (Vite dev) y el rewrite de Vercel. Mismo router.
app.use("/api/jobs", jobsRouter);
app.use("/ai", aiRouter);
app.use("/api/favorites", favoritesRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

// El body-parser marca JSON inválido con err.type = "entity.parse.failed".
// Guard verificado (instanceof + in + igualdad) en vez de tipar err como any.
function isInvalidJson(err: unknown): err is Error & { type: string } {
  return (
    err instanceof Error && "type" in err && err.type === "entity.parse.failed"
  );
}

// eslint-disable-next-line no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);

  if (isInvalidJson(err)) {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  res.status(500).json({ message: "Internal server error" });
});

if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
}

export default app;
