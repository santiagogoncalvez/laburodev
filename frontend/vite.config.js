import { copyFile } from 'node:fs/promises'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// Vercel sirve 404.html con status 404 real cuando ninguna ruta de
// vercel.json matchea. Es una copia del shell de la SPA para que el
// router pinte la página NotFound con el mismo look & feel.
const spa404 = {
  name: 'spa-404',
  apply: 'build',
  closeBundle() {
    return copyFile('dist/index.html', 'dist/404.html')
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spa404],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
