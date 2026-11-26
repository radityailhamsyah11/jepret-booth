import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // relative asset paths: the same build works at a domain root and under /jepret-booth/ on GitHub Pages
  base: './',
  server: { host: '127.0.0.1', port: 5173 },
});
