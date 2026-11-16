// API de favoritos: rutas relativas (mismo origen — Vite proxy en dev,
// rewrite de Vercel en prod) para que las cookies de sesión viajen.

export async function fetchFavorites(): Promise<string[]> {
  const response = await fetch('/api/favorites');
  if (!response.ok) throw new Error('No se pudieron cargar los favoritos');

  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null) return [];
  const data = (body as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  return data.filter((id): id is string => typeof id === 'string');
}

export async function postFavorite(jobId: string): Promise<void> {
  const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId }),
  });
  if (!response.ok) throw new Error('No se pudo guardar el favorito');
}

export async function deleteFavorite(jobId: string): Promise<void> {
  const response = await fetch(`/api/favorites/${jobId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('No se pudo quitar el favorito');
}
