import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Preload the fonts used above the fold, using their hashed build names. */
function preloadFonts(names: string[]): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {}).filter((f) => names.some((n) => f.includes(n)) && f.endsWith('.woff2'));
        return files.map((f) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `./${f}`, crossorigin: '' },
          injectTo: 'head-prepend' as const,
        }));
      },
    },
  };
}

// Relative base so the static build works from any path or host.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), preloadFonts(['newsreader-500', 'newsreader-400-italic', 'plex-sans-400', 'plex-sans-500'])],
});
