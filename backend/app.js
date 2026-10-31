import express from "express";
import { existsSync } from "node:fs";

// Cargar .env ANTES de importar config.js y routes
if (existsSync(".env")) {
   process.loadEnvFile();
}

import { DEFAULTS } from "./config.js";
import { corsMiddleware } from "./middlewares/cors.js";
import { jobsRouter } from "./routes/jobs.js";
import { aiRouter } from "./routes/ai.js";
import { generalLimiter } from "./middlewares/rateLimit.js";

const PORT = process.env.PORT ?? DEFAULTS.PORT;

const app = express();

app.set("trust proxy", 1);

app.use(corsMiddleware());
app.use(express.json());
app.use(generalLimiter);

app.use("/jobs", jobsRouter);
app.use("/ai", aiRouter);

app.use((req, res) => {
   res.status(404).json({ message: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
   console.error(err);

   if (err.type === "entity.parse.failed") {
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