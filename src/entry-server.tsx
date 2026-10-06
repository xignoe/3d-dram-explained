import { renderToString } from 'react-dom/server';
import App from './App';

/** Build-time prerender: the full article as static HTML, hydrated by main.tsx. */
export function render(): string {
  return renderToString(<App />);
}
