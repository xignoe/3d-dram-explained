// Renders the app to static HTML after `vite build`, so text is visible before JS runs.
import { createServer } from 'vite';
import fs from 'node:fs';

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx');
  const html = render();
  const file = 'dist/index.html';
  const tpl = fs.readFileSync(file, 'utf8');
  if (!tpl.includes('<div id="root"></div>')) throw new Error('root placeholder not found');
  fs.writeFileSync(file, tpl.replace('<div id="root"></div>', `<div id="root">${html}</div>`));
  console.log(`prerendered ${(html.length / 1024).toFixed(0)} KB of HTML`);
} finally {
  await vite.close();
}
