import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deleteFavorite, postFavorite } from '@/lib/favoritesApi';

interface FavoritesState {
  // Estado
  favorites: string[];
  /** Con sesión activa, el toggle también sincroniza con el servidor. */
  loggedIn: boolean;

  // Acciones
  setFavorites: (favorites: string[]) => void;
  setLoggedIn: (loggedIn: boolean) => void;
  clearFavorites: () => void;
  addFavorite: (jobId: string) => void;
  removeFavorite: (jobId: string) => void;
  isFavorite: (jobId: string) => boolean;
  toggleFavorite: (jobId: string) => void;
  countFavorites: () => number;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      // Estado
      favorites: [],
      loggedIn: false,

      setFavorites: (favorites) => set({ favorites }),
      setLoggedIn: (loggedIn) => set({ loggedIn }),

      clearFavorites: () => {
        set({ favorites: [] });
      },

      // Acciones
      addFavorite: (jobId) => {
        set((state) => ({
          favorites: state.favorites.includes(jobId)
            ? state.favorites
            : [...state.favorites, jobId],
        }));
      },

      removeFavorite: (jobId) => {
        set((state) => ({
          favorites: state.favorites.filter((id) => id !== jobId),
        }));
      },

      isFavorite: (jobId) => {
        return get().favorites.includes(jobId);
      },

      toggleFavorite: (jobId) => {
        const { addFavorite, removeFavorite, isFavorite, loggedIn } = get();
        const isFav = isFavorite(jobId);
        isFav ? removeFavorite(jobId) : addFavorite(jobId);
        if (loggedIn) {
          // Optimista: si falla, el merge del próximo inicio de sesión corrige.
          void (isFav ? deleteFavorite(jobId) : postFavorite(jobId)).catch(
            () => {
              // Sin red o API caída: lo sincroniza useFavoritesSync.
            },
          );
        }
      },

      countFavorites: () => get().favorites.length,
    }),
    {
      name: 'laburodev-favorites',
      partialize: (state) => ({ favorites: state.favorites }),
    },
  ),
);
