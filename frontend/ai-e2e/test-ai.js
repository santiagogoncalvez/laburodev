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

test("Un usuario puede entrar a la JSConf y adquirir dos entradas por €287.98", async () => {
   assert.ok(process.env.AI_API_KEY, "Falta AI_API_KEY en el .env");

   const browser = await localBrowser.launch();
   const stagehand = await Stagehand.create({
      browser,
      model: {
         modelName: process.env.AI_MODEL ?? "google/gemini-3.8-flash",
         apiKey: process.env.AI_API_KEY,
      },
   });

   try {
      const [page] = await browser.context.pages();
      await page.goto("https://jsconf.es");

      await stagehand.act(
         "Add two 'Entrada' tickets to the cart for the JSConf event",
      );

      const { data: result } = await stagehand.extract(
         "Extract the subtotal amount displayed in the cart",
         z.object({ subtotal: z.string() }),
      );

      assert.strictEqual(result.subtotal, "€287.98");
   } finally {
      await stagehand.close();
      await browser.close();
   }
});
