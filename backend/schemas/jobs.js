import * as z from "zod";

/*
{
    "id": "7a4d1d8b-1e45-4d8c-9f1a-8c2f9a9121a4",
    "title": "Desarrollador de Software Senior",
    "company": "Tech Solutions Inc.",
    "location": "Remoto",
    "description": "Buscamos un ingeniero de software con experiencia en desarrollo web y conocimientos en JavaScript, React y Node.js. El candidato ideal debe ser capaz de trabajar en equipo y tener buenas habilidades de comunicación.",
    "data": {
      "technology": [
        "react",
        "node",
        "javascript"
      ],
      "mode": "remoto",
      "level": "senior"
    },
    "content": {
      "description": "Tech Solutions Inc. está buscando un Ingeniero de Software Senior altamente motivado y experimentado para unirse a nuestro equipo remoto. El candidato ideal tendrá una sólida formación en desarrollo de software, con experiencia en el diseño, desarrollo e implementación de soluciones de software escalables y de alto rendimiento. Como Ingeniero de Software Senior, usted será responsable de liderar proyectos de desarrollo, mentorizar a ingenieros junior y colaborar con equipos multifuncionales para entregar productos de software de alta calidad.",
      "responsibilities": "- Diseñar, desarrollar y mantener aplicaciones web utilizando tecnologías modernas.\n- Colaborar con equipos de producto y diseño para definir y entregar nuevas características.\n- Escribir código limpio, eficiente y bien documentado.\n- Realizar revisiones de código y proporcionar retroalimentación constructiva a los miembros del equipo.\n- Mentorizar ingenieros junior y guiar su desarrollo profesional.\n- Participar en reuniones de planificación y retrospectivas del equipo.\n- Mantenerse actualizado con las últimas tendencias y mejores prácticas en desarrollo de software.",
      "requirements": "- Licenciatura en Informática o campo relacionado.\n- Mínimo de 5 años de experiencia en desarrollo de software.\n- Experiencia con frameworks de JavaScript (por ejemplo, React, Angular, Vue.js).\n- Familiaridad con metodologías ágiles y herramientas de control de versiones (por ejemplo, Git).\n- Excelentes habilidades de comunicación y capacidad para trabajar en equipo.\n- Capacidad demostrada para resolver problemas complejos y pensar de manera crítica.",
      "about": "Tech Solutions Inc. es una empresa de tecnología innovadora que se centra en la creación de soluciones de software de vanguardia para diversas industrias. Estamos comprometidos con el fomento de un entorno de trabajo colaborativo e inclusivo donde cada empleado pueda prosperar y crecer profesionalmente. Ofrecemos salarios competitivos, beneficios integrales y oportunidades de desarrollo profesional continuo."
    }
  },
*/

const LEVELS = ["junior", "mid-level", "senior", "lead"];

const dataSchema = z.object({
   technology: z
      .array(z.string().min(1, "Las tecnologías no pueden estar vacías"))
      .min(1, "Debe haber al menos una tecnología"),
   mode: z.string().optional(),
   level: z.enum(LEVELS, { error: "El nivel no es válido" }).optional(),
});

const contentSchema = z.object({
   description: z.string().optional(),
   responsibilities: z.string().optional(),
   requirements: z.string().optional(),
   about: z.string().optional(),
});

const jobSchema = z.object({
   title: z
      .string({
         error: "El título es obligatorio",
      })
      .min(3, "El título debe tener al menos 3 caracteres")
      .max(100, "El título no puede tener más de 100 caracteres"),
   company: z
      .string({
         error: "La empresa es obligatoria",
      })
      .min(1, "La empresa es obligatoria"),
   location: z.string().optional(),
   description: z.string().optional(),
   data: dataSchema,
   content: contentSchema.optional(),
});

const partialJobSchema = z.object({
   title: jobSchema.shape.title.optional(),
   company: jobSchema.shape.company.optional(),
   location: jobSchema.shape.location,
   description: jobSchema.shape.description,
   data: dataSchema.partial().optional(),
   content: contentSchema.partial().optional(),
});

export function validateJob(job) {
   return jobSchema.safeParse(job);
}

export function validatePartialJob(job) {
   return partialJobSchema.safeParse(job);
}
