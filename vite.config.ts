import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [
    solidPlugin(),
    cloudflare(),
    tailwindcss()
  ],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    target: 'esnext',
    cssMinify: true,
  },
});