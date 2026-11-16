import { createAuthClient } from 'better-auth/react';

// Better Auth en modo mismo origen (Vite proxy en dev, rewrite en Vercel):
// no hace falta baseURL ni credentials, las cookies viajan igual que en prod.
export const authClient = createAuthClient();

export const { useSession } = authClient;
