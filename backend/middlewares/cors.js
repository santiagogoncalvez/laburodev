import express from "express";
import cors from "cors";

// Orígenes permitidos por env (separados por coma).
// Default: solo el frontend local. En deploy: FRONTEND_URL=https://tu-front.com
const ACCEPTED_ORIGINS = (process.env.FRONTEND_URL ?? "http://localhost:5173")
   .split(",")
   .map((origin) => origin.trim().replace(/\/+$/, ""))
   .filter(Boolean);

export const corsMiddleware = ({ acceptedOrigins = ACCEPTED_ORIGINS } = {}) => {
   return cors({
      origin: (origin, callback) => {
         // Sin origin: curl, scripts, server-to-server
         if (!origin || acceptedOrigins.includes(origin)) {
            return callback(null, true);
         }

         return callback(new Error("Origen no permitido"));
      },
   });
};
