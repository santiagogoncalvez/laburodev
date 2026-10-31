import { Router } from "express";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import * as z from "zod";

import { JobModel } from "../models/jobs.js";
import { aiRateLimiter } from "../middlewares/rateLimit.js";
import { CONFIG } from "../config.js";

const google = createGoogleGenerativeAI({
   apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export const aiRouter = Router();
aiRouter.use(aiRateLimiter);

const summaryParamsSchema = z.object({
   id: z.string().uuid("ID de empleo inválido"),
});

// Wrapper para async handlers en Express 5
const asyncHandler = (fn) => (req, res, next) =>
   Promise.resolve(fn(req, res, next)).catch(next);

aiRouter.get("/summary/:id", asyncHandler(async (req, res) => {
   const parseResult = summaryParamsSchema.safeParse(req.params);
   if (!parseResult.success) {
      let msg = "ID de empleo inválido";
      if (parseResult.error && parseResult.error.errors && parseResult.error.errors.length > 0) {
         msg = parseResult.error.errors[0].message;
      } else if (parseResult.error && parseResult.error.issues && parseResult.error.issues.length > 0) {
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
         maxTokens: 300,
      });

      const webResponse = result.toTextStreamResponse();

      webResponse.headers.forEach((value, key) => {
         res.setHeader(key, value);
      });
      res.status(webResponse.status);
      res.flushHeaders();

      console.log("[AI] Starting stream pipe...");
      const reader = webResponse.body.getReader();
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
      console.error("Error generando resumen:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (!res.headersSent) {
         res.setHeader("Content-Type", "application/json");
         return res.status(500).json({ error: "Error generando el resumen", detail: message });
      }
      res.end();
   }
}));