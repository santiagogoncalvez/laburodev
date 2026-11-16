import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { fetchFavorites, postFavorite } from '@/lib/favoritesApi';
import { useFavoritesStore } from '@/store/favoritesStore';

/**
 * Sincroniza los favoritos con el servidor al iniciar sesión:
 * sube los del invitado (merge local ∪ servidor) y activa el sync
 * del toggle mientras haya sesión.
 */
export function useFavoritesSync(): void {
  const { data, isPending } = useSession();
  const setFavorites = useFavoritesStore((state) => state.setFavorites);
  const setLoggedIn = useFavoritesStore((state) => state.setLoggedIn);

  useEffect(() => {
    if (isPending) return;

    const loggedIn = Boolean(data);
    setLoggedIn(loggedIn);
    if (!loggedIn) return;

    const cancelled = false;

    (async () => {
      const serverIds = await fetchFavorites();
      if (cancelled) return;

      const localIds = useFavoritesStore.getState().favorites;
      const merged = [...new Set([...localIds, ...serverIds])];
      setFavorites(merged);

      // Subir los favoritos del invitado que faltan en el servidor.
      const missing = localIds.filter((id) => !serverIds.includes(id));
      await Promise.all(missing.map((id) => postFavorite(id)));
    })().catch(() => {
      // Sin red o API caída: siguen vigentes los favoritos locales.
    });
  }, [data, isPending, setFavorites, setLoggedIn]);
}
