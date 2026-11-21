// API de escritura de empleos: rutas relativas /api/jobs (mismo origen —
// Vite proxy en dev, rewrite de Vercel en prod) para que las cookies de
// sesión viajen. El GET del detalle también usa el alias para que el
// userId del dueño llegue en mismo origen.

export interface JobFormInput {
  title: string;
  company: string;
  location?: string;
  data: {
    technology: string[];
    mode?: string;
    level?: string;
  };
  // Todo el texto vive en content (el backend persiste content.*, no campos
  // top-level — ver backend/models/jobs.ts create/update).
  content: {
    description?: string;
    responsibilities?: string[];
    requirements?: string[];
    about?: string;
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof body.message === 'string'
    ) {
      return body.message;
    }
  } catch {
    // Sin body JSON: mensaje genérico.
  }
  return 'Ocurrió un error. Intentá de nuevo.';
}

export async function createJob(input: JobFormInput): Promise<string> {
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const job: unknown = await response.json();
  if (typeof job === 'object' && job !== null && 'id' in job) {
    return String(job.id);
  }
  throw new Error('Respuesta inesperada del servidor');
}

export async function updateJob(
  id: string,
  input: JobFormInput,
): Promise<string> {
  const response = await fetch(`/api/jobs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return id;
}

export async function deleteJob(id: string): Promise<void> {
  const response = await fetch(`/api/jobs/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(await parseError(response));
}
