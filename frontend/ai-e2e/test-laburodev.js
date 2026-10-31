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

const FRONTEND_URL = process.env.AI_FRONTEND_URL ?? "http://localhost:5173";

async function openAgent() {
   assert.ok(process.env.AI_API_KEY, "Falta AI_API_KEY en el .env");

   const browser = await localBrowser.launch();
   const stagehand = await Stagehand.create({
      browser,
      model: {
         modelName: process.env.AI_MODEL ?? "google/gemini-3.1-flash-lite",
         apiKey: process.env.AI_API_KEY,
      },
   });

   const [page] = await browser.context.pages();

   // stagehand.close() no cierra el browser: sin browser.close() el proceso no sale
   return { browser, page, stagehand };
}

// El page de Stagehand no es un Page de Playwright: no tiene waitForURL ni
// getByRole. Las esperas y las verificaciones se hacen con evaluate.
async function esperar(page, condicion, ms = 20000) {
   const limite = Date.now() + ms;

   while (Date.now() < limite) {
      if (await page.evaluate(condicion)) {
         return;
      }
      await page.waitForTimeout(300);
   }

   throw new Error(`Timeout esperando: ${condicion.toString()}`);
}

const hayOfertas = () => document.querySelectorAll("article.job-listing-card").length > 0;

const tieneFavoritoMarcado = () => Boolean(document.querySelector('button[aria-label="Quitar de favoritos"]'));

test("Un usuario busca react y abre la primera oferta", async () => {
   const { browser, page, stagehand } = await openAgent();

   try {
      await page.goto(`${FRONTEND_URL}/`);

      // Un act por paso: si se le pide dos cosas, tipea y no aprieta Buscar
      await stagehand.act('Escribí "react" en el campo de búsqueda');
      await stagehand.act('Hacé clic en el botón "Buscar"');

      await esperar(page, () => window.location.search.includes("text=react"));
      await esperar(page, hayOfertas);

      const { data: results } = await stagehand.extract(
         "Extrae el titulo de la primera oferta de empleo de la lista (firstTitle), el texto del enlace principal del primer articulo. Cadena vacia si la lista esta vacia",
         z.object({ firstTitle: z.string() }),
      );

      assert.ok(
         results.firstTitle.trim().length > 0,
         "La búsqueda de react devuelve al menos una oferta",
      );

      await stagehand.act(
         `Hacé clic en el título de la primera oferta, "${results.firstTitle}"`,
      );

      await esperar(
         page,
         () => window.location.pathname.startsWith("/jobs/") && Boolean(document.querySelector("h1")),
      );

      const detailTitle = await page.evaluate(
         () => document.querySelector("h1")?.textContent?.trim() ?? "",
      );

      assert.strictEqual(detailTitle, results.firstTitle.trim());
   } finally {
      await stagehand.close();
      await browser.close();
   }
});

test("Un favorito sigue marcado después de recargar", async () => {
   const { browser, page, stagehand } = await openAgent();

   try {
      await page.goto(`${FRONTEND_URL}/search`);

      await esperar(page, hayOfertas);
      await esperar(
         page,
         () => Boolean(document.querySelector('button[aria-label="Agregar a favoritos"]')),
      );

      await stagehand.act(
         'Hacé clic en el botón "Agregar a favoritos" (corazón) de la primera oferta de la lista',
      );

      await esperar(page, tieneFavoritoMarcado);

      await page.reload();

      await esperar(page, hayOfertas);
      await esperar(page, tieneFavoritoMarcado);

      const marcada = await page.evaluate(
         () => document.querySelector('button[aria-label="Quitar de favoritos"]')?.getAttribute("aria-pressed") === "true",
      );

      assert.ok(marcada, "El favorito persistió tras recargar");
   } finally {
      await stagehand.close();
      await browser.close();
   }
});