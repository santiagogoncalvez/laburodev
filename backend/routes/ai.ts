import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import { z } from "zod";
import { CONFIG } from "@/config.js";
import { aiRateLimiter } from "@/middlewares/rateLimit.js";
import { JobModel } from "@/models/jobs.js";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const aiRouter = Router();
aiRouter.use(aiRateLimiter);

const summaryParamsSchema = z.object({
  id: z.string().uuid("ID de empleo inválido"),
});

// Wrapper para async handlers en Express 5
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

aiRouter.get(
  "/summary/:id",
  asyncHandler(async (req, res) => {
    const parseResult = summaryParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      // Zod v4: los errores viven solo en .issues (la rama .errors ya no existe)
      let msg = "ID de empleo inválido";
      if (parseResult.error.issues.length > 0) {
        msg = parseResult.error.issues[0].message;
      }
      return res.status(400).json({ error: msg });
    }

    const { id } = parseResult.data;
    const job = await JobModel.getById(id);

    if (!job) {
      return res.status(404).json({ error: "Empleo no encontrado" });
    }

    const techList = job.data?.technology?.length
      ? job.data.technology.join(", ")
      : "No especificado";

    const level = job.data?.level ? job.data.level : "No especificado";

    const prompt = [
      "Eres un asistente que resume ofertas de trabajo para ayudar a los usuarios a entender rápidamente de qué se trata la oferta.",
      "Responde SOLO con el resumen en markdown, sin introducciones ni comentarios adicionales.",
      "",
      "Resume en 4-6 frases la siguiente oferta de trabajo:",
      "- Incluye: rol, empresa, ubicación, nivel y tecnologías clave",
      "- Usa un tono claro, directo y profesional en español",
      "",
      `Título: ${job.title}`,
      `Empresa: ${job.company}`,
      `Ubicación: ${job.location}`,
      `Nivel: ${level}`,
      `Tecnologías: ${techList}`,
      `Descripción: ${job.content?.description ?? "No disponible"}`,
    ].join("\n");

    try {
      const result = streamText({
        model: google(CONFIG.MODEL_AI),
        prompt,
        temperature: 0.3,
        maxOutputTokens: 300,
      });

      const webResponse = result.toTextStreamResponse();

      // Guard tipado antes de tocar headers: sin aserción `!` sobre body.
      const body = webResponse.body;
      if (!body) {
        return res.status(502).json({ error: "Respuesta vacía del modelo" });
      }

      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      res.status(webResponse.status);
      res.flushHeaders();

      console.log("[AI] Starting stream pipe...");
      const reader = body.getReader();
      let chunkCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        console.log("[AI] Read:", { done, valueLength: value?.length });
        if (done) break;
        chunkCount++;
        res.write(value);
      }
      console.log("[AI] Stream ended, chunks:", chunkCount);
      res.end();
    } catch (error) {
      // El detalle queda solo en el log del servidor: la respuesta nunca
      // expone mensajes internos del SDK/modelo (info disclosure).
      console.error("Error generando resumen:", error);
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json");
        return res.status(500).json({ error: "Error generando el resumen" });
      }
      res.end();
    }
  }),
);
