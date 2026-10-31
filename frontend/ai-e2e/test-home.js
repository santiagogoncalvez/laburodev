import { existsSync } from "node:fs";

for (const file of [".env", "ai-e2e/.env"]) {
   if (existsSync(file)) {
      process.loadEnvFile(file);
   }
}

import { test } from "node:test";
import assert from "node:assert";
import { z } from "zod";
import { localBrowser, Stagehand } from "@browserbasehq/stagehand";

test("La home anuncia la próxima edición y el programa tiene charlas", async () => {
   assert.ok(process.env.AI_API_KEY, "Falta AI_API_KEY en el .env");

   const browser = await localBrowser.launch();
   const stagehand = await Stagehand.create({
      browser,
      model: {
         modelName: process.env.AI_MODEL ?? "google/gemini-3.1-flash-lite",
         apiKey: process.env.AI_API_KEY,
      },
   });

   try {
      const [page] = await browser.context.pages();
      await page.goto("https://jsconf.es");

      const { data: result } = await stagehand.extract(
         "Extrae el año de la proxima edicion anunciada en la pagina (nextEdition, la pagina dice 'Volvemos en AÑO'), la sede del evento (venue) y la lista de titulos de las charlas (talks), solo las marcadas como charla sin workshops",
         z.object({
            venue: z.string(),
            nextEdition: z.string(),
            talks: z.array(z.string()),
         }),
      );

      assert.ok(result.nextEdition.includes("2027"), "Apunta a 2027");
      assert.ok(result.venue.includes("La Nave"), "Sede La Nave");
      assert.ok(
         result.talks.length >= 10,
         `Hay al menos 10 charlas, hay ${result.talks.length}`,
      );
      assert.ok(
         result.talks.every((t) => t.trim().length > 0),
         "Ningún título vacío",
      );
   } finally {
      await stagehand.close();
      await browser.close();
   }
});
