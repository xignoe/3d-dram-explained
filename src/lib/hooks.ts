import { useEffect, useState, type RefObject } from 'react';

function useMedia(query: string): boolean {
  // Start false on both server and client so prerendered HTML hydrates cleanly; the effect corrects it.
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');
export const useDesktop = () => useMedia('(min-width: 768px)');
export const useWide = () => useMedia('(min-width: 1024px)');

/** True while the element is within (or near) the viewport. */
export function useInView(ref: RefObject<Element | null>, rootMargin = '100px'): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}

let webglCache: boolean | null = null;
export function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    webglCache = !!gl && !gl.isContextLost();
    // Release the test context right away so it doesn't count against the browser's limit on live WebGL contexts.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** setInterval that only runs while `active`. */
export function useTicker(active: boolean, ms: number, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(fn, ms);
    return () => window.clearInterval(id);
  }, [active, ms, fn]);
}
