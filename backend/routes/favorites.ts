import { Router } from "express";
import { z } from "zod";

import { getSessionUserId } from "@/middlewares/session.js";
import { FavoriteModel } from "@/models/favorites.js";

export const favoritesRouter = Router();

const jobIdBodySchema = z.object({
  jobId: z.string().uuid("ID de empleo inválido"),
});

const jobIdParamsSchema = z.object({
  jobId: z.string().uuid("ID de empleo inválido"),
});

// GET /api/favorites — ids de favoritos del usuario en sesión
favoritesRouter.get("/", async (req, res) => {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Sesión requerida" });
  }

  const favorites = await FavoriteModel.listByUser(userId);
  return res.json({ data: favorites });
});

// POST /api/favorites — agrega { jobId } (idempotente: doble click = un favorito)
favoritesRouter.post("/", async (req, res) => {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Sesión requerida" });
  }

  const parsed = jobIdBodySchema.safeParse(req.body);
  if (!parsed.success) {
    // Zod v4: los errores viven solo en .issues
    const issue = parsed.error.issues[0];
    return res
      .status(400)
      .json({ message: issue?.message ?? "Datos inválidos" });
  }

  const created = await FavoriteModel.add(userId, parsed.data.jobId);
  if (!created) {
    return res.status(404).json({ message: "Empleo no encontrado" });
  }

  return res.status(201).json({ data: { jobId: parsed.data.jobId } });
});

// DELETE /api/favorites/:jobId — quita el favorito (idempotente)
favoritesRouter.delete("/:jobId", async (req, res) => {
  const userId = await getSessionUserId(req);
  if (!userId) {
    return res.status(401).json({ message: "Sesión requerida" });
  }

  const parsed = jobIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res
      .status(400)
      .json({ message: issue?.message ?? "Datos inválidos" });
  }

  await FavoriteModel.remove(userId, parsed.data.jobId);
  return res.json({ data: { jobId: parsed.data.jobId } });
});
