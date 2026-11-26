import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import app from "./app.js";
import { db } from "./db/index.js";

let server;
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

let createdId;
let validationId;

// Etapas B y C: sesión + ownership + rol (x-api-key fue reemplazado).
// Tres usuarios de test: el dueño escribe, el otro verifica los 403 de
// ownership y el candidate verifica los 403 de rol.
const OWNER_EMAIL = "jobs-owner-test@laburodev.dev";
const OTHER_EMAIL = "jobs-other-test@laburodev.dev";
const CANDIDATE_EMAIL = "jobs-candidate-test@laburodev.dev";
const TEST_PASSWORD = "password123";
let ownerHeaders; // { "Content-Type", Cookie } — escrituras del dueño (recruiter)
let otherHeaders; // { "Content-Type", Cookie } — recruiter no dueño
let candidateHeaders; // { "Content-Type", Cookie } — candidate sin permiso de escritura

// Limpia los usuarios de test y sus empleos. Idempotente (corridas cortadas).
async function cleanTestUsers() {
   for (const email of [OWNER_EMAIL, OTHER_EMAIL, CANDIDATE_EMAIL]) {
      const byEmail = 'SELECT id FROM "user" WHERE email = ?';
      await db.execute({
         sql: "DELETE FROM jobs WHERE user_id IN (" + byEmail + ")",
         args: [email],
      });
      await db.execute({
         sql: "DELETE FROM favorites WHERE user_id IN (" + byEmail + ")",
         args: [email],
      });
      await db.execute({
         sql: "DELETE FROM session WHERE userId IN (" + byEmail + ")",
         args: [email],
      });
      await db.execute({
         sql: "DELETE FROM account WHERE userId IN (" + byEmail + ")",
         args: [email],
      });
      await db.execute({
         sql: 'DELETE FROM "user" WHERE email = ?',
         args: [email],
      });
   }
}

async function signUp(email, role = "recruiter") {
   const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         name: "Test Jobs",
         email,
         password: TEST_PASSWORD,
         role,
      }),
   });
   assert.strictEqual(response.status, 200);
   const cookie = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
   assert.ok(cookie, "Debe devolver la cookie de sesión");
   return { "Content-Type": "application/json", Cookie: cookie };
}

// antes de cada test se inicia el servidor
before(async () => {
   await cleanTestUsers();

   return new Promise((resolve, reject) => {
      server = app.listen(PORT, () => resolve());
      server.on("error", reject);
   }).then(async () => {
      ownerHeaders = await signUp(OWNER_EMAIL);
      otherHeaders = await signUp(OTHER_EMAIL);
      candidateHeaders = await signUp(CANDIDATE_EMAIL, "candidate");
   });
});

// despues de cada test se cierra el servidor
after(async () => {
   await cleanTestUsers();
   if (server) {
      return new Promise((resolve, reject) => {
         server.close((err) => {
            if (err) reject(err);
            else resolve();
         });
      });
   }
});

describe("GET /jobs", () => {
   test("debe responder con 200 y un array de trabajos", async () => {
      const response = await fetch(`${BASE_URL}/jobs`);
      assert.strictEqual(response.status, 200);

      const json = await response.json();
      assert.ok(Array.isArray(json.data), "El resultado debe ser un array");
   });

   test("debe filtrar trabajos por tecnología", async () => {
      const tech = "react";
      const response = await fetch(`${BASE_URL}/jobs?technology=${tech}`);
      assert.strictEqual(response.status, 200);

      const json = await response.json();
      assert.ok(
         json.data.every((job) => job.data.technology.some(t => t.toLowerCase().includes(tech))),
         `Todos los trabajos deben incluir la tecnología ${tech}`,
      );
   });
});

describe("GET /jobs/:id", () => {
   test("debe devolver un trabajo existente con sus campos", async () => {
      const list = await (await fetch(`${BASE_URL}/jobs?limit=1`)).json();
      const id = list.data[0].id;

      const response = await fetch(`${BASE_URL}/jobs/${id}`);
      assert.strictEqual(response.status, 200);

      const job = await response.json();
      assert.strictEqual(job.id, id);
      assert.ok(job.title && job.company, "Debe tener título y empresa");
   });

   test("debe responder 404 con un id inexistente", async () => {
      const response = await fetch(`${BASE_URL}/jobs/no-existe`);
      assert.strictEqual(response.status, 404);

      const json = await response.json();
      assert.strictEqual(json.message, "Job not found");
   });
});

describe("GET /jobs filtros y paginación", () => {
   test("debe buscar por texto en título o descripción", async () => {
      const text = "react";
      const response = await fetch(`${BASE_URL}/jobs?text=${text}`);
      assert.strictEqual(response.status, 200);

      const json = await response.json();
      assert.ok(
         json.data.every(
            (job) =>
               job.title.toLowerCase().includes(text) ||
               job.content.description.toLowerCase().includes(text),
         ),
         "Todos deben coincidir con el texto buscado",
      );
   });

   test("debe filtrar por nivel", async () => {
      const level = "senior";
      const response = await fetch(`${BASE_URL}/jobs?level=${level}`);
      assert.strictEqual(response.status, 200);

      const json = await response.json();
      assert.ok(json.data.length > 0, "Debe haber trabajos senior");
      assert.ok(
         json.data.every((job) => job.data.level.toLowerCase() === level),
         "Todos deben ser del nivel pedido",
      );
   });

   test("debe devolver total correcto con filtro", async () => {
      // Regresión del bug: el COUNT se llevaba puesto el slice(0, -2) y
      // devolvía total=0 con cualquier filtro.
      const json = await (
         await fetch(`${BASE_URL}/jobs?technology=react&limit=50`)
      ).json();
      assert.ok(json.total > 0, "El total con filtro debe ser mayor a 0");
      assert.ok(
         json.total >= json.data.length,
         "El total debe ser mayor o igual a los resultados traídos",
      );
   });

   test("debe paginar con limit y offset sin repetir", async () => {
      const page1 = await (
         await fetch(`${BASE_URL}/jobs?limit=2&offset=0`)
      ).json();
      const page2 = await (
         await fetch(`${BASE_URL}/jobs?limit=2&offset=2`)
      ).json();

      assert.strictEqual(page1.data.length, 2);
      assert.strictEqual(page1.limit, 2);
      assert.strictEqual(page2.data.length, 2);
      assert.notDeepStrictEqual(
         page1.data.map((job) => job.id),
         page2.data.map((job) => job.id),
         "Las páginas deben traer trabajos distintos",
      );
   });

   test("debe topear el limit en 50", async () => {
      const json = await (
         await fetch(`${BASE_URL}/jobs?limit=999`)
      ).json();
      assert.strictEqual(json.limit, 50);
   });

   test("debe responder 400 con limit inválido", async () => {
      const response = await fetch(`${BASE_URL}/jobs?limit=abc`);
      assert.strictEqual(response.status, 400);
   });

   test("debe responder 404 en rutas desconocidas", async () => {
      const response = await fetch(`${BASE_URL}/no-existe`);
      assert.strictEqual(response.status, 404);
   });
});

describe("GET /jobs/options", () => {
   test("debe devolver tecnologías, ubicaciones y niveles distintos", async () => {
      const response = await fetch(`${BASE_URL}/jobs/options`);
      assert.strictEqual(response.status, 200);

      const options = await response.json();
      assert.ok(Array.isArray(options.technologies) && options.technologies.length > 0, "tecnologías");
      assert.ok(Array.isArray(options.locations) && options.locations.length > 0, "ubicaciones");
      assert.ok(!options.locations.includes("Remoto"), "Remoto ya no es ubicación");
      assert.ok(Array.isArray(options.levels) && options.levels.includes("senior"), "niveles");
      assert.strictEqual(new Set(options.locations).size, options.locations.length, "sin duplicados");
   });
});

describe("Filtros exactos", () => {
   test("technology=java no debe devolver javascript", async () => {
      const java = await (await fetch(`${BASE_URL}/jobs?technology=java&limit=50`)).json();
      assert.ok(java.data.every((job) => job.data.technology.includes("java")), "solo tecnología exacta");

      const js = await (await fetch(`${BASE_URL}/jobs?technology=javascript&limit=50`)).json();
      assert.ok(js.data.length > 0, "javascript sí debe devolver resultados");
   });

   test("location=Argentina solo debe devolver Argentina", async () => {
      const json = await (await fetch(`${BASE_URL}/jobs?location=Argentina&limit=50`)).json();
      assert.ok(json.data.length > 0, "Argentina debe devolver resultados");
      assert.ok(json.data.every((job) => job.location === "Argentina"));
   });
});

describe("POST /jobs", () => {
   test("debe crear con 201 y devolver el trabajo", async () => {
      const body = {
         title: "QA Manual Tester",
         company: "ACME Corp",
         location: "Remoto",
         data: { technology: ["qa"], mode: "remoto", level: "junior" },
         content: { description: "Testing web apps", responsibilities: ["Test"], requirements: ["JS"], about: "Good company" }
      };
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify(body),
      });
      assert.strictEqual(response.status, 201);

      const job = await response.json();
      assert.ok(job.id, "Debe tener id generado");
      assert.strictEqual(job.title, body.title);
      assert.strictEqual(job.company, body.company);
      createdId = job.id;
   });

   test("debe responder 400 sin campos obligatorios", async () => {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({}),
      });
      assert.strictEqual(response.status, 400);
   });
});

describe("PUT /jobs/:id", () => {
   let putId;
   before(async () => {
      const body = {
         title: "Test Job for PUT",
         company: "Test Corp",
         data: { technology: ["qa"], mode: "remoto", level: "junior" },
         content: { description: "Desc", responsibilities: ["A"], requirements: ["B"], about: "C" }
      };
      const res = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify(body),
      });
      const job = await res.json();
      putId = job.id;
   });

   after(async () => {
      // Limpieza: no dejar filas de test en la DB local
      await fetch(`${BASE_URL}/jobs/${putId}`, {
         method: "DELETE",
         headers: { ...ownerHeaders },
      });
   });

   test("debe reemplazar con 200", async () => {
      const body = {
         title: "QA Automatizador Senior",
         company: "ACME Corp",
         location: "Remoto",
         data: { technology: ["qa", "selenium"], mode: "remoto", level: "senior" },
         content: { description: "Automated testing", responsibilities: ["Write tests"], requirements: ["Python"], about: "Great place" }
      };
      const response = await fetch(`${BASE_URL}/jobs/${putId}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify(body),
      });
      assert.strictEqual(response.status, 200);

      const job = await response.json();
      assert.strictEqual(job.id, putId);
      assert.strictEqual(job.title, body.title);
      assert.strictEqual(job.data.level, "senior");
   });

   test("debe responder 400 si faltan campos", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${createdId}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({ title: "Incompleto" }),
      });
      assert.strictEqual(response.status, 400);
   });

   test("debe responder 404 con un id inexistente", async () => {
      const response = await fetch(`${BASE_URL}/jobs/no-existe`, {
         method: "PUT",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({
            title: "Xyz Developer",
            company: "X Corp",
            location: "Remoto",
            data: { technology: ["x"], modality: "remoto", level: "junior" },
            content: { description: "Dev", responsibilities: ["Code"], requirements: ["JS"], about: "About" }
         }),
      });
      assert.strictEqual(response.status, 404);
   });
});

describe("PATCH /jobs/:id", () => {
   let patchId;
   before(async () => {
      const body = {
         title: "Test Job for PATCH",
         company: "Test Corp",
         data: { technology: ["react"], mode: "remoto", level: "junior" },
         content: { description: "Desc", responsibilities: ["A"], requirements: ["B"], about: "C" }
      };
      const res = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify(body),
      });
      const job = await res.json();
      patchId = job.id;
   });

   after(async () => {
      // Limpieza: no dejar filas de test en la DB local
      await fetch(`${BASE_URL}/jobs/${patchId}`, {
         method: "DELETE",
         headers: { ...ownerHeaders },
      });
   });

   test("debe actualizar solo lo enviado", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${patchId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({ title: "QA Solo Título Actualizado" }),
      });
      assert.strictEqual(response.status, 200);

      const job = await response.json();
      assert.strictEqual(job.title, "QA Solo Título Actualizado");
      assert.strictEqual(job.company, "Test Corp", "Lo no enviado se conserva");
   });

   test("debe responder 400 sin nada para actualizar", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${createdId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({}),
      });
      assert.strictEqual(response.status, 400);
   });

   test("debe responder 404 con un id inexistente", async () => {
      const response = await fetch(`${BASE_URL}/jobs/no-existe`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({ title: "Xyz" }),
      });
      assert.strictEqual(response.status, 404);
   });
});

describe("validaciones zod", () => {
   test("POST debe responder 400 si el título es muy corto", async () => {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({
            title: "QA",
            company: "ACME",
            location: "Remoto",
            data: { technology: ["qa"], modality: "remoto", level: "junior" },
            content: { description: "Desc", responsibilities: ["A"], requirements: ["B"], about: "C" }
         }),
      });
      assert.strictEqual(response.status, 400);

      const json = await response.json();
      assert.strictEqual(
         json.message,
         "El título debe tener al menos 3 caracteres",
      );
   });

   test("POST debe responder 400 sin tecnologías", async () => {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({
            title: "QA Manual",
            company: "ACME",
            location: "Remoto",
            data: { technology: [], modality: "remoto", level: "junior" },
            content: { description: "Desc", responsibilities: ["A"], requirements: ["B"], about: "C" }
         }),
      });
      assert.strictEqual(response.status, 400);
   });

   test("POST debe responder 400 con un nivel inválido", async () => {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({
            title: "QA Manual",
            company: "ACME",
            location: "Remoto",
            data: { technology: ["qa"], modality: "remoto", level: "mid" },
            content: { description: "Desc", responsibilities: ["A"], requirements: ["B"], about: "C" }
         }),
      });
      assert.strictEqual(response.status, 400);
   });

   test("POST debe ignorar campos desconocidos", async () => {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({
            title: "QA Manual Tester",
            company: "ACME",
            location: "Remoto",
            data: { technology: ["qa"], modality: "remoto", level: "junior" },
            content: { description: "Desc", responsibilities: ["A"], requirements: ["B"], about: "C" },
            hack: "campo extra",
         }),
      });
      assert.strictEqual(response.status, 201);

      const job = await response.json();
      assert.ok(!("hack" in job), "Los campos extra no se guardan");
      validationId = job.id;
   });

   test("PUT debe aceptar sin location porque es opcional", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${validationId}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({
            title: "QA Manual Updated",
            company: "ACME",
            data: { technology: ["qa"], modality: "remoto", level: "junior" },
            content: { description: "Desc", responsibilities: ["A"], requirements: ["B"], about: "C" }
         }),
      });
      assert.strictEqual(response.status, 200);
   });

   test("PATCH debe aceptar data parcial anidada", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${validationId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({ data: { level: "senior" } }),
      });
      assert.strictEqual(response.status, 200);

      const job = await response.json();
      assert.strictEqual(job.data.level, "senior");
      assert.strictEqual(job.title, "QA Manual Updated", "Lo no enviado se conserva");
   });

   test("PATCH debe responder 400 con un título inválido", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${validationId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({ title: "x" }),
      });
      assert.strictEqual(response.status, 400);
   });

   test("DELETE debe limpiar el trabajo de validación", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${validationId}`, {
         method: "DELETE",
         headers: { ...ownerHeaders },
      });
      assert.strictEqual(response.status, 204);
   });
});

describe("DELETE /jobs/:id", () => {
   test("debe borrar con 204 y el trabajo deja de existir", async () => {
      const deleted = await fetch(`${BASE_URL}/jobs/${createdId}`, {
         method: "DELETE",
         headers: { ...ownerHeaders },
      });
      assert.strictEqual(deleted.status, 204);

      const response = await fetch(`${BASE_URL}/jobs/${createdId}`);
      assert.strictEqual(response.status, 404);
   });

   test("debe responder 404 con un id inexistente", async () => {
      const response = await fetch(`${BASE_URL}/jobs/no-existe`, {
         method: "DELETE",
         headers: { ...ownerHeaders },
      });
      assert.strictEqual(response.status, 404);
   });
});

describe("GET /ai/summary/:id - [AI]", () => {
   let validJobId;

   before(async () => {
      const list = await (await fetch(`${BASE_URL}/jobs?limit=1`)).json();
      validJobId = list.data[0].id;
   });

   test("debe responder 200 y stream de texto con resumen", async () => {
      const response = await fetch(`${BASE_URL}/ai/summary/${validJobId}`);
      assert.strictEqual(response.status, 200);
      assert.strictEqual(
         response.headers.get("content-type"),
         "text/plain; charset=utf-8",
      );

      const text = await response.text();
      assert.ok(text.length > 0, "Debe devolver contenido");
      assert.ok(
         /tech|senior|developer|software|javascript|react/i.test(text),
         "Resumen debe contener palabras clave del trabajo",
      );
   });

   test("debe responder 404 con id inexistente", async () => {
      const response = await fetch(`${BASE_URL}/ai/summary/no-existe`);
      assert.strictEqual(response.status, 400); // Zod validation UUID
      const json = await response.json();
      assert.ok(json.error);
   });

   test("debe responder 404 con UUID válido pero trabajo no existe", async () => {
      const fakeUuid = "00000000-0000-0000-0000-000000000000";
      const response = await fetch(`${BASE_URL}/ai/summary/${fakeUuid}`);
      assert.strictEqual(response.status, 404);
      const json = await response.json();
      assert.strictEqual(json.error, "Empleo no encontrado");
   });

   test("debe incluir headers de rate limit", async () => {
      const response = await fetch(`${BASE_URL}/ai/summary/${validJobId}`);
      assert.ok(response.headers.get("ratelimit"), "Header RateLimit presente");
      assert.ok(
         response.headers.get("ratelimit-policy"),
         "Header RateLimit-Policy presente",
      );
   });
});

describe("Autorización por sesión (Etapa B)", () => {
   test("POST, PUT, PATCH y DELETE responden 401 sin sesión", async () => {
      const post = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            title: "Sin sesión",
            company: "ACME",
            data: { technology: ["qa"], mode: "remoto", level: "junior" },
         }),
      });
      assert.strictEqual(post.status, 401);

      const put = await fetch(`${BASE_URL}/jobs/${createdId}`, {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            title: "Sin sesión",
            company: "ACME",
            data: { technology: ["qa"], mode: "remoto", level: "junior" },
         }),
      });
      assert.strictEqual(put.status, 401);

      const patch = await fetch(`${BASE_URL}/jobs/${createdId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ title: "Sin sesión" }),
      });
      assert.strictEqual(patch.status, 401);

      const del = await fetch(`${BASE_URL}/jobs/${createdId}`, {
         method: "DELETE",
      });
      assert.strictEqual(del.status, 401);
   });

   test("debe dejar GET abierto sin sesión", async () => {
      const response = await fetch(`${BASE_URL}/jobs`);
      assert.strictEqual(response.status, 200);
   });

   test("POST con sesión asigna user_id del dueño en la respuesta", async () => {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: ownerHeaders,
         body: JSON.stringify({
            title: "Job con dueño",
            company: "ACME",
            data: { technology: ["qa"], mode: "remoto", level: "junior" },
         }),
      });
      assert.strictEqual(response.status, 201);

      const job = await response.json();
      assert.ok(job.userId, "Debe devolver userId asignado por el servidor");
      createdId = job.id;
   });
});

describe("Ownership: solo el dueño edita/borra (Etapa B)", () => {
   let seedJobId; // empleo del seed (user_id NULL) — solo lectura
   let ownerJobId;

   before(async () => {
      // Empleo del seed: cualquiera de la DB que no tenga dueño.
      const list = await (await fetch(`${BASE_URL}/jobs?limit=50`)).json();
      const seedJob = list.data.find((job) => !job.userId);
      assert.ok(seedJob, "Debe existir al menos un empleo del seed sin user_id");
      seedJobId = seedJob.id;

      // Empleo del dueño: creado con la sesión del owner.
      const res = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: ownerHeaders,
         body: JSON.stringify({
            title: "Empleo del dueño",
            company: "Owner Corp",
            data: { technology: ["react"], mode: "remoto", level: "senior" },
         }),
      });
      const job = await res.json();
      ownerJobId = job.id;
   });

   after(async () => {
      // Limpieza: el dueño borra su empleo (si el fix ya está aplicado)
      await fetch(`${BASE_URL}/jobs/${ownerJobId}`, {
         method: "DELETE",
         headers: ownerHeaders,
      });
   });

   test("GET /jobs/:id devuelve userId (string | null)", async () => {
      const seed = await (await fetch(`${BASE_URL}/jobs/${seedJobId}`)).json();
      assert.strictEqual(seed.userId, null, "El seed no tiene dueño");

      const owned = await (await fetch(`${BASE_URL}/jobs/${ownerJobId}`)).json();
      assert.ok(typeof owned.userId === "string", "El empleo creado tiene dueño");
   });

   test("PUT de empleo ajeno responde 403", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${ownerJobId}`, {
         method: "PUT",
         headers: otherHeaders,
         body: JSON.stringify({
            title: "Intento ajeno",
            company: "Hack Corp",
            data: { technology: ["qa"], mode: "remoto", level: "junior" },
         }),
      });
      assert.strictEqual(response.status, 403);
   });

   test("PUT de empleo del seed (sin dueño) responde 403", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${seedJobId}`, {
         method: "PUT",
         headers: ownerHeaders,
         body: JSON.stringify({
            title: "Intento sobre seed",
            company: "Hack Corp",
            data: { technology: ["qa"], mode: "remoto", level: "junior" },
         }),
      });
      assert.strictEqual(response.status, 403);
   });

   test("DELETE de empleo ajeno responde 403", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${ownerJobId}`, {
         method: "DELETE",
         headers: otherHeaders,
      });
      assert.strictEqual(response.status, 403);
   });

   test("DELETE de empleo del seed responde 403", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${seedJobId}`, {
         method: "DELETE",
         headers: ownerHeaders,
      });
      assert.strictEqual(response.status, 403);
   });

   test("PATCH de empleo ajeno responde 403", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${ownerJobId}`, {
         method: "PATCH",
         headers: otherHeaders,
         body: JSON.stringify({ title: "Intento patch ajeno" }),
      });
      assert.strictEqual(response.status, 403);
   });

   test("PUT y DELETE con id inexistente responden 404 (con sesión)", async () => {
      const put = await fetch(`${BASE_URL}/jobs/no-existe`, {
         method: "PUT",
         headers: ownerHeaders,
         body: JSON.stringify({
            title: "Xyz",
            company: "X",
            data: { technology: ["x"], mode: "remoto", level: "junior" },
         }),
      });
      assert.strictEqual(put.status, 404);

      const del = await fetch(`${BASE_URL}/jobs/no-existe`, {
         method: "DELETE",
         headers: ownerHeaders,
      });
      assert.strictEqual(del.status, 404);
   });
});


describe("Roles: solo recruiter publica y administra (Etapa C)", () => {
   const ROLE_MESSAGE = "Se necesita rol recruiter para publicar empleos";
   const OWNERSHIP_MESSAGE = "No autorizado para modificar este empleo";
   const CANDIDATE_TITLE = "T005 intento de publicación de candidate";

   async function countWithTitle(title) {
      const result = await db.execute({
         sql: "SELECT count(*) AS total FROM jobs WHERE title = ?",
         args: [title],
      });
      return Number(result.rows[0].total);
   }

   async function createAsRecruiter(title) {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({
            title,
            company: "Owner Corp",
            data: { technology: ["react"], mode: "remoto", level: "senior" },
         }),
      });
      const text = await response.text();
      assert.strictEqual(response.status, 201, text);
      return JSON.parse(text);
   }

   test("candidate con sesión no puede publicar y no inserta fila", async () => {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...candidateHeaders },
         body: JSON.stringify({
            title: CANDIDATE_TITLE,
            company: "Candidate Corp",
            data: { technology: ["qa"], mode: "remoto", level: "junior" },
         }),
      });
      assert.strictEqual(response.status, 403);
      const json = await response.json();
      assert.strictEqual(json.message, ROLE_MESSAGE);
      assert.strictEqual(
         await countWithTitle(CANDIDATE_TITLE),
         0,
         "Un candidate no debe insertar empleos",
      );
   });

   test("candidate no puede editar ni borrar un empleo ajeno", async () => {
      const job = await createAsRecruiter("T005 empleo para intentos de candidate");
      try {
         const put = await fetch(`${BASE_URL}/jobs/${job.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...candidateHeaders },
            body: JSON.stringify({
               title: "T005 overwrite",
               company: "Candidate Corp",
               data: { technology: ["qa"], mode: "remoto", level: "junior" },
            }),
         });
         assert.strictEqual(put.status, 403);
         assert.strictEqual((await put.json()).message, ROLE_MESSAGE);

         const patch = await fetch(`${BASE_URL}/jobs/${job.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...candidateHeaders },
            body: JSON.stringify({ title: "T005 patch" }),
         });
         assert.strictEqual(patch.status, 403);
         assert.strictEqual((await patch.json()).message, ROLE_MESSAGE);

         const del = await fetch(`${BASE_URL}/jobs/${job.id}`, {
            method: "DELETE",
            headers: candidateHeaders,
         });
         assert.strictEqual(del.status, 403);
         assert.strictEqual((await del.json()).message, ROLE_MESSAGE);

         const stillThere = await fetch(`${BASE_URL}/jobs/${job.id}`);
         assert.strictEqual(stillThere.status, 200, "El empleo no debe borrarse");
      } finally {
         await fetch(`${BASE_URL}/jobs/${job.id}`, {
            method: "DELETE",
            headers: ownerHeaders,
         });
      }
   });

   test("recruiter publica, edita y borra sus propios empleos", async () => {
      const job = await createAsRecruiter("T005 recruiter publica y administra");
      const owner = await db.execute({
         sql: 'SELECT id FROM "user" WHERE email = ?',
         args: [OWNER_EMAIL],
      });
      assert.strictEqual(job.userId, owner.rows[0].id);

      const patch = await fetch(`${BASE_URL}/jobs/${job.id}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json", ...ownerHeaders },
         body: JSON.stringify({ title: "T005 recruiter editó" }),
      });
      assert.strictEqual(patch.status, 200);
      assert.strictEqual((await patch.json()).title, "T005 recruiter editó");

      const del = await fetch(`${BASE_URL}/jobs/${job.id}`, {
         method: "DELETE",
         headers: ownerHeaders,
      });
      assert.strictEqual(del.status, 204);
   });

   test("recruiter no dueño recibe 403 de ownership, no de rol", async () => {
      const job = await createAsRecruiter("T005 empleo ajeno para recruiter");
      try {
         const response = await fetch(`${BASE_URL}/jobs/${job.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...otherHeaders },
            body: JSON.stringify({ title: "T005 intento ajeno" }),
         });
         assert.strictEqual(response.status, 403);
         assert.strictEqual((await response.json()).message, OWNERSHIP_MESSAGE);
      } finally {
         await fetch(`${BASE_URL}/jobs/${job.id}`, {
            method: "DELETE",
            headers: ownerHeaders,
         });
      }
   });

   test("la lectura sigue abierta para candidate y para anónimos", async () => {
      const anonymous = await fetch(`${BASE_URL}/jobs?limit=1`);
      assert.strictEqual(anonymous.status, 200);

      const loggedIn = await fetch(`${BASE_URL}/jobs?limit=1`, {
         headers: candidateHeaders,
      });
      assert.strictEqual(loggedIn.status, 200);
   });
});

describe("Perfil: candidate puede pasar a recruiter (Etapa C)", () => {
   test("update-user con role persiste y habilita la publicación", async () => {
      const updated = await fetch(`${BASE_URL}/api/auth/update-user`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...candidateHeaders },
         body: JSON.stringify({ name: "Test Jobs", role: "recruiter" }),
      });
      assert.strictEqual(updated.status, 200, await updated.text());

      const session = await (await fetch(`${BASE_URL}/api/auth/get-session`, {
         headers: candidateHeaders,
      })).json();
      assert.strictEqual(session.user.role, "recruiter");

      const published = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json", ...candidateHeaders },
         body: JSON.stringify({
            title: "T005 candidate ascendido",
            company: "New Recruiter Corp",
            data: { technology: ["qa"], mode: "remoto", level: "junior" },
         }),
      });
      assert.strictEqual(published.status, 201);
      const job = await published.json();
      assert.strictEqual(job.userId, session.user.id);

      await fetch(`${BASE_URL}/jobs/${job.id}`, {
         method: "DELETE",
         headers: candidateHeaders,
      });
   });
});
