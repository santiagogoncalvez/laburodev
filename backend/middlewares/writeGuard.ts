import { timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

// Guard temporal de escritura (POST/PUT/PATCH/DELETE en /jobs) hasta que
// exista auth real (roadmap #2). La key se lee POR REQUEST desde el env para
// que los tests puedan setearla antes de arrancar el server.
// Fail-closed: sin WRITE_API_KEY configurada las escrituras quedan bloqueadas.
function safeEqual(a: string, b: string): boolean {
   const ba = Buffer.from(a, "utf8");
   const bb = Buffer.from(b, "utf8");
   return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function writeGuard(req: Request, res: Response, next: NextFunction) {
   const configured = process.env.WRITE_API_KEY;

   if (!configured) {
      return res
         .status(503)
         .json({ message: "Escrituras deshabilitadas: falta WRITE_API_KEY" });
   }

   const provided = req.get("x-api-key");
   if (!provided || !safeEqual(provided, configured)) {
      return res.status(401).json({ message: "API key inválida" });
   }

   next();
}
