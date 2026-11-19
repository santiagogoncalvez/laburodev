import { useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { fetchFavorites, postFavorite } from '@/lib/favoritesApi';
import { useFavoritesStore } from '@/store/favoritesStore';

/**
 * Sincroniza los favoritos con el servidor al iniciar sesión:
 * sube los del invitado (merge local ∪ servidor), guarda el favorito
 * pendiente del modal de login y activa el sync del toggle con sesión.
 */
export function useFavoritesSync(): void {
  const { data, isPending } = useSession();
  const setFavorites = useFavoritesStore((state) => state.setFavorites);
  const setLoggedIn = useFavoritesStore((state) => state.setLoggedIn);
  const setSessionReady = useFavoritesStore((state) => state.setSessionReady);

  useEffect(() => {
    if (isPending) return;
    setSessionReady(true);

    const loggedIn = Boolean(data);
    setLoggedIn(loggedIn);
    if (!loggedIn) return;

    const cancelled = false;

    (async () => {
      const serverIds = await fetchFavorites();
      if (cancelled) return;

      const { favorites: localIds, pendingFavorite } =
        useFavoritesStore.getState();
      const merged = [...new Set([...localIds, ...serverIds])];
      const missing = localIds.filter((id) => !serverIds.includes(id));

      // El favorito pendiente del modal de login se suma a la vista y a la cola.
      if (pendingFavorite && !merged.includes(pendingFavorite)) {
        merged.push(pendingFavorite);
        missing.push(pendingFavorite);
      }

      setFavorites(merged);

      // Subir los favoritos del invitado que faltan en el servidor.
      await Promise.all(missing.map((id) => postFavorite(id)));

      // Guardado: el modal puede descartarse con el pendiente ya resuelto.
      if (pendingFavorite) {
        useFavoritesStore.getState().dismissLoginModal();
      }
    })().catch(() => {
      // Sin red o API caída: siguen vigentes los favoritos locales.
    });
  }, [data, isPending, setFavorites, setLoggedIn, setSessionReady]);
}
