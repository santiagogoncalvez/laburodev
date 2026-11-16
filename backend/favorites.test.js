import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import app from "./app.js";
import { db } from "./db/index.js";

let server;
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

const TEST_EMAIL = "favoritos-test@laburodev.dev";
const TEST_PASSWORD = "password123";
let cookieHeader;
let jobId;

// Limpia al usuario de test. Idempotente: sirve en before (corridas
// anteriores que se cortaron) y en after (no dejar filas de test).
async function cleanTestUser() {
   const byEmail = "SELECT id FROM \"user\" WHERE email = ?";
   await db.execute({
      sql: "DELETE FROM favorites WHERE user_id IN (" + byEmail + ")",
      args: [TEST_EMAIL],
   });
   await db.execute({
      sql: "DELETE FROM session WHERE userId IN (" + byEmail + ")",
      args: [TEST_EMAIL],
   });
   await db.execute({
      sql: "DELETE FROM account WHERE userId IN (" + byEmail + ")",
      args: [TEST_EMAIL],
   });
   await db.execute({
      sql: "DELETE FROM \"user\" WHERE email = ?",
      args: [TEST_EMAIL],
   });
}

before(async () => {
   await cleanTestUser();

   await new Promise((resolve, reject) => {
      server = app.listen(PORT, () => resolve());
      server.on("error", reject);
   });

   // Alta del usuario de test: la cookie de sesión se reutiliza en todos tests
   const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         name: "Test Favoritos",
         email: TEST_EMAIL,
         password: TEST_PASSWORD,
      }),
   });
   assert.strictEqual(response.status, 200);
   cookieHeader = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
   assert.ok(cookieHeader, "Debe devolver la cookie de sesión");

   const list = await (await fetch(`${BASE_URL}/jobs?limit=1`)).json();
   jobId = list.data[0].id;
});

after(async () => {
   await cleanTestUser();
   if (server) {
      return new Promise((resolve, reject) => {
         server.close((err) => {
            if (err) reject(err);
            else resolve();
         });
      });
   }
});

describe("Favoritos sin sesión", () => {
   test("GET, POST y DELETE responden 401", async () => {
      const get = await fetch(`${BASE_URL}/api/favorites`);
      assert.strictEqual(get.status, 401);

      const post = await fetch(`${BASE_URL}/api/favorites`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ jobId }),
      });
      assert.strictEqual(post.status, 401);

      const del = await fetch(`${BASE_URL}/api/favorites/${jobId}`, {
         method: "DELETE",
      });
      assert.strictEqual(del.status, 401);
   });
});

describe("Favoritos con sesión", () => {
   test("POST agrega con 201", async () => {
      const response = await fetch(`${BASE_URL}/api/favorites`, {
         method: "POST",
         headers: { "Content-Type": "application/json", Cookie: cookieHeader },
         body: JSON.stringify({ jobId }),
      });
      assert.strictEqual(response.status, 201);

      const json = await response.json();
      assert.strictEqual(json.data.jobId, jobId);
   });

   test("POST repetido responde 201 (idempotente)", async () => {
      const response = await fetch(`${BASE_URL}/api/favorites`, {
         method: "POST",
         headers: { "Content-Type": "application/json", Cookie: cookieHeader },
         body: JSON.stringify({ jobId }),
      });
      assert.strictEqual(response.status, 201);
   });

   test("GET devuelve el favorito guardado", async () => {
      const response = await fetch(`${BASE_URL}/api/favorites`, {
         headers: { Cookie: cookieHeader },
      });
      assert.strictEqual(response.status, 200);

      const json = await response.json();
      assert.ok(json.data.includes(jobId), "El favorito debe estar en la lista");
   });

   test("POST con jobId inexistente responde 404", async () => {
      const response = await fetch(`${BASE_URL}/api/favorites`, {
         method: "POST",
         headers: { "Content-Type": "application/json", Cookie: cookieHeader },
         body: JSON.stringify({ jobId: "00000000-0000-4000-8000-000000000000" }),
      });
      assert.strictEqual(response.status, 404);
   });

   test("POST con jobId inválido responde 400", async () => {
      const response = await fetch(`${BASE_URL}/api/favorites`, {
         method: "POST",
         headers: { "Content-Type": "application/json", Cookie: cookieHeader },
         body: JSON.stringify({ jobId: "no-es-uuid" }),
      });
      assert.strictEqual(response.status, 400);
   });

   test("DELETE quita con 200 y GET queda sin ese favorito", async () => {
      const del = await fetch(`${BASE_URL}/api/favorites/${jobId}`, {
         method: "DELETE",
         headers: { Cookie: cookieHeader },
      });
      assert.strictEqual(del.status, 200);

      const get = await fetch(`${BASE_URL}/api/favorites`, {
         headers: { Cookie: cookieHeader },
      });
      const json = await get.json();
      assert.ok(!json.data.includes(jobId), "El favorito ya no debe estar");
   });
});
