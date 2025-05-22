import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { cloudflare } from "@cloudflare/vite-plugin";


export default defineConfig({
  plugins: [solidPlugin(), tailwindcss(), cloudflare()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
});