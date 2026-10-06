import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative base so the static build works from any path or host.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
