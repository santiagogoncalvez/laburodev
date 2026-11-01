import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import app from "./app.js";

let server;
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

let createdId;
let validationId;

// antes de cada test se inicia el servidor
before(async () => {
   return new Promise((resolve, reject) => {
      server = app.listen(PORT, () => resolve());
      server.on("error", reject);
   });
});

// despues de cada test se cierra el servidor
after(async () => {
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
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(body),
      });
      const job = await res.json();
      putId = job.id;
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
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ title: "Incompleto" }),
      });
      assert.strictEqual(response.status, 400);
   });

   test("debe responder 404 con un id inexistente", async () => {
      const response = await fetch(`${BASE_URL}/jobs/no-existe`, {
         method: "PUT",
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(body),
      });
      const job = await res.json();
      patchId = job.id;
   });

   test("debe actualizar solo lo enviado", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${patchId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({}),
      });
      assert.strictEqual(response.status, 400);
   });

   test("debe responder 404 con un id inexistente", async () => {
      const response = await fetch(`${BASE_URL}/jobs/no-existe`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ title: "Xyz" }),
      });
      assert.strictEqual(response.status, 404);
   });
});

describe("validaciones zod", () => {
   test("POST debe responder 400 si el título es muy corto", async () => {
      const response = await fetch(`${BASE_URL}/jobs`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
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
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ title: "x" }),
      });
      assert.strictEqual(response.status, 400);
   });

   test("DELETE debe limpiar el trabajo de validación", async () => {
      const response = await fetch(`${BASE_URL}/jobs/${validationId}`, {
         method: "DELETE",
      });
      assert.strictEqual(response.status, 204);
   });
});

describe("DELETE /jobs/:id", () => {
   test("debe borrar con 204 y el trabajo deja de existir", async () => {
      const deleted = await fetch(`${BASE_URL}/jobs/${createdId}`, {
         method: "DELETE",
      });
      assert.strictEqual(deleted.status, 204);

      const response = await fetch(`${BASE_URL}/jobs/${createdId}`);
      assert.strictEqual(response.status, 404);
   });

   test("debe responder 404 con un id inexistente", async () => {
      const response = await fetch(`${BASE_URL}/jobs/no-existe`, {
         method: "DELETE",
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
